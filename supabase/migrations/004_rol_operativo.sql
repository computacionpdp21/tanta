-- =============================================================================
-- 004 Rol operativo
-- Ejecutar DESPUÉS de 003, en una query NUEVA del SQL Editor.
-- El COMMIT del medio es obligatorio: Postgres no deja usar un valor de enum
-- en la misma transacción donde se agregó.
-- =============================================================================

alter type public.rol_usuario add value if not exists 'operativo';

commit;

begin;

create or replace function public.puede_gestionar_pedidos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_rol(array['admin', 'vendedor', 'operativo']::public.rol_usuario[]);
$$;

create or replace function public.puede_cobrar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_rol(array['admin', 'vendedor', 'entregas', 'operativo']::public.rol_usuario[]);
$$;

create or replace function public.cambiar_estado_pedido(
  p_pedido_id uuid,
  p_estado_nuevo public.estado_pedido,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario;
  v_actual public.estado_pedido;
  v_ord_act integer;
  v_ord_nuevo integer;
  v_resultado jsonb;
begin
  v_rol := public.mi_rol();
  if v_rol is null then
    raise exception 'No autorizado';
  end if;

  select estado into v_actual from public.pedidos where id = p_pedido_id;
  if v_actual is null then
    raise exception 'No se encontró el pedido';
  end if;

  if v_actual = p_estado_nuevo then
    raise exception 'El pedido ya está en ese estado';
  end if;

  v_ord_act := public.estado_orden(v_actual);
  v_ord_nuevo := public.estado_orden(p_estado_nuevo);

  if p_estado_nuevo = 'cancelado' then
    if v_actual = 'entregado' then
      raise exception 'No se puede cancelar un pedido ya entregado';
    end if;
    if v_rol not in ('admin', 'vendedor', 'operativo') then
      raise exception 'No puedes cancelar pedidos';
    end if;
  elsif v_rol = 'admin' then
    if v_actual = 'cancelado' then
      if p_estado_nuevo <> 'pendiente' then
        raise exception 'Un pedido cancelado solo puede reabrirse a Pendiente';
      end if;
    elsif abs(v_ord_nuevo - v_ord_act) <> 1 or v_ord_nuevo = 0 then
      raise exception 'Solo se puede avanzar o retroceder un estado a la vez';
    end if;
  elsif v_rol in ('vendedor', 'operativo') then
    if v_ord_nuevo <> v_ord_act + 1 or v_ord_nuevo = 0 then
      raise exception 'Solo puedes avanzar al siguiente estado';
    end if;
  elsif v_rol = 'produccion' then
    if not (
      (v_actual = 'pendiente' and p_estado_nuevo = 'en_produccion')
      or (v_actual = 'en_produccion' and p_estado_nuevo = 'listo')
    ) then
      raise exception 'Producción solo puede pasar a En producción o Listo';
    end if;
  elsif v_rol = 'entregas' then
    if not (v_actual = 'listo' and p_estado_nuevo = 'entregado') then
      raise exception 'Entregas solo puede marcar como Entregado cuando está Listo';
    end if;
  else
    raise exception 'No autorizado';
  end if;

  perform set_config('app.historial_nota', coalesce(p_nota, ''), true);

  update public.pedidos
  set estado = p_estado_nuevo
  where id = p_pedido_id;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = p_pedido_id;

  return v_resultado;
end;
$$;

create or replace function public.enforce_pedido_update_por_rol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rol_usuario;
begin
  r := public.mi_rol();
  if r is null then
    raise exception 'No autorizado';
  end if;

  if r in ('admin', 'vendedor', 'operativo') then
    return new;
  end if;

  if r = 'produccion' then
    if old.estado in ('entregado', 'cancelado') then
      raise exception 'No se puede cambiar un pedido entregado o cancelado';
    end if;
    if new.estado not in ('pendiente', 'en_produccion', 'listo') then
      raise exception 'Producción solo puede pasar a En producción o Listo';
    end if;
    if new.cliente_nombre is distinct from old.cliente_nombre
      or new.cliente_telefono is distinct from old.cliente_telefono
      or new.tipo_entrega is distinct from old.tipo_entrega
      or new.direccion is distinct from old.direccion
      or new.referencia_ubicacion is distinct from old.referencia_ubicacion
      or new.fecha_entrega is distinct from old.fecha_entrega
      or new.hora_entrega is distinct from old.hora_entrega
      or new.adelanto is distinct from old.adelanto
      or new.metodo_pago_adelanto is distinct from old.metodo_pago_adelanto
      or new.costo_envio is distinct from old.costo_envio
      or new.notas is distinct from old.notas
      or new.numero is distinct from old.numero
      or new.creado_por is distinct from old.creado_por
    then
      raise exception 'Producción solo puede cambiar el estado del pedido';
    end if;
    return new;
  end if;

  if r = 'entregas' then
    if new.estado not in (old.estado, 'entregado') then
      raise exception 'Entregas solo puede marcar como Entregado';
    end if;
    if old.estado = 'cancelado' then
      raise exception 'No se puede entregar un pedido cancelado';
    end if;
    if new.cliente_nombre is distinct from old.cliente_nombre
      or new.cliente_telefono is distinct from old.cliente_telefono
      or new.tipo_entrega is distinct from old.tipo_entrega
      or new.direccion is distinct from old.direccion
      or new.referencia_ubicacion is distinct from old.referencia_ubicacion
      or new.fecha_entrega is distinct from old.fecha_entrega
      or new.hora_entrega is distinct from old.hora_entrega
      or new.adelanto is distinct from old.adelanto
      or new.metodo_pago_adelanto is distinct from old.metodo_pago_adelanto
      or new.costo_envio is distinct from old.costo_envio
      or new.notas is distinct from old.notas
      or new.numero is distinct from old.numero
      or new.creado_por is distinct from old.creado_por
    then
      raise exception 'Entregas solo puede marcar entregado';
    end if;
    return new;
  end if;

  raise exception 'No autorizado';
end;
$$;

drop policy if exists pedidos_insert on public.pedidos;
create policy pedidos_insert
  on public.pedidos
  for insert
  to authenticated
  with check (public.es_rol(array['admin', 'vendedor', 'operativo']::public.rol_usuario[]));

drop policy if exists pedidos_update on public.pedidos;
create policy pedidos_update
  on public.pedidos
  for update
  to authenticated
  using (
    public.es_rol(array['admin', 'vendedor', 'produccion', 'entregas', 'operativo']::public.rol_usuario[])
  )
  with check (
    public.es_rol(array['admin', 'vendedor', 'produccion', 'entregas', 'operativo']::public.rol_usuario[])
  );

drop policy if exists pedido_items_write on public.pedido_items;
create policy pedido_items_write
  on public.pedido_items
  for all
  to authenticated
  using (public.es_rol(array['admin', 'vendedor', 'operativo']::public.rol_usuario[]))
  with check (public.es_rol(array['admin', 'vendedor', 'operativo']::public.rol_usuario[]));

grant execute on function public.puede_gestionar_pedidos() to authenticated;
grant execute on function public.puede_cobrar() to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido, text) to authenticated;

commit;
