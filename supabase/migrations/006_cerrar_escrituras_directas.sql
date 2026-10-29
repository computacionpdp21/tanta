-- =============================================================================
-- 006 Cerrar escrituras directas
-- Ejecutar DESPUÉS de 005, en una query NUEVA del SQL Editor.
-- Completa y re-ejecutable.
--
-- El frontend solo escribe pedidos/ítems/pagos/perfiles vía RPC (security definer).
-- authenticated queda con SELECT. productos sigue con escritura (solo admin, RLS).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- cambiar_estado_pedido: reglas explícitas de rol
--   · producción no retrocede; solo pendiente→en_produccion y en_produccion→listo
--   · entregas solo listo→entregado
--   · nadie toca entregado/cancelado salvo admin
--   · admin retrocede de a un estado; cancelado solo se reabre a pendiente
-- -----------------------------------------------------------------------------
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

  if v_actual in ('entregado', 'cancelado') and v_rol is distinct from 'admin' then
    raise exception 'Solo un administrador puede cambiar un pedido entregado o cancelado';
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
    if v_ord_nuevo < v_ord_act then
      raise exception 'Producción no puede retroceder estados';
    end if;
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

-- Defensa extra si alguien vuelve a otorgar UPDATE: producción/entregas no saltan reglas.
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
    if not (
      (old.estado = 'pendiente' and new.estado = 'en_produccion')
      or (old.estado = 'en_produccion' and new.estado = 'listo')
    ) then
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
    if old.estado in ('entregado', 'cancelado') then
      raise exception 'No se puede cambiar un pedido entregado o cancelado';
    end if;
    if new.estado is distinct from old.estado
      and not (old.estado = 'listo' and new.estado = 'entregado')
    then
      raise exception 'Entregas solo puede marcar como Entregado cuando está Listo';
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

-- Sin políticas de escritura: RLS niega INSERT/UPDATE/DELETE aunque alguien re-otorgue GRANT.
drop policy if exists pedidos_insert on public.pedidos;
drop policy if exists pedidos_update on public.pedidos;
drop policy if exists pedidos_delete_admin on public.pedidos;
drop policy if exists pedido_items_write on public.pedido_items;
drop policy if exists perfiles_update_admin on public.perfiles;
drop policy if exists perfiles_update_propio_nombre on public.perfiles;

revoke insert, update, delete on public.pedidos from authenticated, anon, public;
revoke insert, update, delete on public.pedido_items from authenticated, anon, public;
revoke insert, update, delete on public.pagos from authenticated, anon, public;
revoke insert, update, delete on public.perfiles from authenticated, anon, public;
revoke insert, update, delete on public.pedido_historial from authenticated, anon, public;

grant select on public.pedidos to authenticated;
grant select on public.pedido_items to authenticated;
grant select on public.pagos to authenticated;
grant select on public.perfiles to authenticated;
grant select on public.pedido_historial to authenticated;
grant select on public.pedidos_con_totales to authenticated;

grant execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido, text) to authenticated;
grant execute on function public.crear_pedido(text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.actualizar_pedido(uuid, text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.registrar_pago_saldo(uuid, numeric, public.metodo_pago) to authenticated;
grant execute on function public.admin_actualizar_perfil(uuid, text, public.rol_usuario, boolean) to authenticated;
grant execute on function public.admin_listar_usuarios() to authenticated;

-- Esperado: SELECT true; INSERT/UPDATE/DELETE false en pedidos, ítems, pagos y perfiles.
-- productos_update sigue true: el catálogo lo edita el admin directo (RLS).
select
  has_table_privilege('authenticated', 'public.pedidos', 'SELECT') as pedidos_select,
  has_table_privilege('authenticated', 'public.pedidos', 'INSERT') as pedidos_insert,
  has_table_privilege('authenticated', 'public.pedidos', 'UPDATE') as pedidos_update,
  has_table_privilege('authenticated', 'public.pedidos', 'DELETE') as pedidos_delete,
  has_table_privilege('authenticated', 'public.pedido_items', 'SELECT') as items_select,
  has_table_privilege('authenticated', 'public.pedido_items', 'INSERT') as items_insert,
  has_table_privilege('authenticated', 'public.pedido_items', 'UPDATE') as items_update,
  has_table_privilege('authenticated', 'public.pedido_items', 'DELETE') as items_delete,
  has_table_privilege('authenticated', 'public.pagos', 'SELECT') as pagos_select,
  has_table_privilege('authenticated', 'public.pagos', 'INSERT') as pagos_insert,
  has_table_privilege('authenticated', 'public.pagos', 'UPDATE') as pagos_update,
  has_table_privilege('authenticated', 'public.perfiles', 'SELECT') as perfiles_select,
  has_table_privilege('authenticated', 'public.perfiles', 'INSERT') as perfiles_insert,
  has_table_privilege('authenticated', 'public.perfiles', 'UPDATE') as perfiles_update,
  has_table_privilege('authenticated', 'public.perfiles', 'DELETE') as perfiles_delete,
  has_table_privilege('authenticated', 'public.productos', 'UPDATE') as productos_update;

commit;
