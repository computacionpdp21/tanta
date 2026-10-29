-- =============================================================================
-- 003 Auditoría, pagos de saldo, RPC de estado y cobro
-- Re-ejecutable. Una query aparte en el SQL Editor. NO incluye el rol operativo.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Helpers de permiso (004 ampliará el array con operativo)
-- -----------------------------------------------------------------------------
create or replace function public.puede_gestionar_pedidos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]);
$$;

create or replace function public.puede_cobrar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_rol(array['admin', 'vendedor', 'entregas']::public.rol_usuario[]);
$$;

grant execute on function public.puede_gestionar_pedidos() to authenticated;
grant execute on function public.puede_cobrar() to authenticated;

-- -----------------------------------------------------------------------------
-- Historial: columna nota (usuario = cambiado_por)
-- -----------------------------------------------------------------------------
alter table public.pedido_historial
  add column if not exists nota text;

create or replace function public.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nota text;
begin
  v_nota := nullif(current_setting('app.historial_nota', true), '');

  if tg_op = 'INSERT' then
    insert into public.pedido_historial (
      pedido_id, estado_anterior, estado_nuevo, cambiado_por, nota
    ) values (
      new.id, null, new.estado, coalesce(new.creado_por, auth.uid()), v_nota
    );
    perform set_config('app.historial_nota', '', true);
    return new;
  end if;

  if tg_op = 'UPDATE' and old.estado is distinct from new.estado then
    insert into public.pedido_historial (
      pedido_id, estado_anterior, estado_nuevo, cambiado_por, nota
    ) values (
      new.id, old.estado, new.estado, auth.uid(), v_nota
    );
    perform set_config('app.historial_nota', '', true);
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pagos de saldo (el adelanto sigue en pedidos.adelanto para no romper el form)
-- -----------------------------------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  monto numeric(10, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  tipo text not null check (tipo in ('adelanto', 'saldo')),
  usuario_id uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_pagos_pedido_id on public.pagos (pedido_id, created_at);

alter table public.pagos enable row level security;

drop policy if exists pagos_select on public.pagos;
drop policy if exists pagos_write_rpc on public.pagos;

create policy pagos_select
  on public.pagos
  for select
  to authenticated
  using (public.es_activo());

-- Sin insert/update/delete directo: solo funciones DEFINER
grant select on public.pagos to authenticated;

-- -----------------------------------------------------------------------------
-- Vista de totales: saldo = total − adelanto − pagos de saldo
-- -----------------------------------------------------------------------------
drop view if exists public.pedidos_con_totales;

create view public.pedidos_con_totales
with (security_invoker = true) as
select
  p.id,
  p.numero,
  p.numero_formateado,
  p.cliente_nombre,
  p.cliente_telefono,
  p.tipo_entrega,
  p.direccion,
  p.referencia_ubicacion,
  p.fecha_entrega,
  p.hora_entrega,
  p.estado,
  p.adelanto,
  p.metodo_pago_adelanto,
  p.costo_envio,
  p.notas,
  p.metodo_pago_saldo,
  p.cobrado_en,
  p.creado_por,
  p.created_at,
  p.updated_at,
  coalesce(i.subtotal, 0)::numeric(12, 2) as subtotal_items,
  (coalesce(i.subtotal, 0) + p.costo_envio)::numeric(12, 2) as total,
  coalesce(pg.pagos_saldo, 0)::numeric(12, 2) as pagos_saldo,
  (coalesce(i.subtotal, 0) + p.costo_envio - p.adelanto - coalesce(pg.pagos_saldo, 0))::numeric(12, 2) as saldo,
  coalesce(ir.resumen, '') as items_resumen
from public.pedidos p
left join (
  select pedido_id, sum(cantidad * precio_unitario) as subtotal
  from public.pedido_items
  group by pedido_id
) i on i.pedido_id = p.id
left join (
  select pedido_id, sum(monto) as pagos_saldo
  from public.pagos
  where tipo = 'saldo'
  group by pedido_id
) pg on pg.pedido_id = p.id
left join (
  select
    pedido_id,
    string_agg(cantidad::text || ' × ' || descripcion, ', ' order by created_at) as resumen
  from public.pedido_items
  group by pedido_id
) ir on ir.pedido_id = p.id;

grant select on public.pedidos_con_totales to authenticated;

-- -----------------------------------------------------------------------------
-- Insertar ítems y devolver subtotal
-- -----------------------------------------------------------------------------
create or replace function public.insertar_items_pedido(p_pedido_id uuid, p_items jsonb)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_descripcion text;
  v_cantidad integer;
  v_precio numeric;
  v_subtotal numeric := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'El pedido debe tener al menos un ítem';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_descripcion := nullif(trim(v_item ->> 'descripcion'), '');
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 0);
    v_precio := coalesce((v_item ->> 'precio_unitario')::numeric, -1);

    if v_descripcion is null then
      raise exception 'Cada ítem necesita una descripción';
    end if;
    if v_cantidad < 1 then
      raise exception 'La cantidad debe ser mayor a 0';
    end if;
    if v_precio < 0 then
      raise exception 'El precio unitario no puede ser negativo';
    end if;

    insert into public.pedido_items (
      pedido_id, producto_id, descripcion, cantidad, precio_unitario, notas_item
    ) values (
      p_pedido_id,
      nullif(v_item ->> 'producto_id', '')::uuid,
      v_descripcion,
      v_cantidad,
      v_precio,
      nullif(trim(v_item ->> 'notas_item'), '')
    );

    v_subtotal := v_subtotal + (v_cantidad * v_precio);
  end loop;

  return v_subtotal;
end;
$$;

-- -----------------------------------------------------------------------------
-- crear_pedido (DEFINER + verificación de rol + adelanto <= total)
-- -----------------------------------------------------------------------------
create or replace function public.crear_pedido(
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_tipo_entrega public.tipo_entrega,
  p_direccion text,
  p_referencia_ubicacion text,
  p_fecha_entrega date,
  p_hora_entrega time,
  p_adelanto numeric,
  p_metodo_pago_adelanto public.metodo_pago,
  p_costo_envio numeric,
  p_notas text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos;
  v_subtotal numeric;
  v_total numeric;
  v_resultado jsonb;
begin
  if not public.puede_gestionar_pedidos() then
    raise exception 'No autorizado para crear pedidos';
  end if;

  insert into public.pedidos (
    cliente_nombre, cliente_telefono, tipo_entrega, direccion, referencia_ubicacion,
    fecha_entrega, hora_entrega, adelanto, metodo_pago_adelanto, costo_envio, notas, creado_por
  ) values (
    trim(p_cliente_nombre),
    trim(p_cliente_telefono),
    p_tipo_entrega,
    case when p_tipo_entrega = 'envio' then nullif(trim(p_direccion), '') else null end,
    nullif(trim(p_referencia_ubicacion), ''),
    p_fecha_entrega,
    p_hora_entrega,
    coalesce(p_adelanto, 0),
    p_metodo_pago_adelanto,
    coalesce(p_costo_envio, 0),
    nullif(trim(p_notas), ''),
    auth.uid()
  )
  returning * into v_pedido;

  v_subtotal := public.insertar_items_pedido(v_pedido.id, p_items);
  v_total := v_subtotal + coalesce(v_pedido.costo_envio, 0);

  if coalesce(p_adelanto, 0) > v_total then
    raise exception 'El adelanto no puede ser mayor al total';
  end if;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = v_pedido.id;

  return v_resultado;
end;
$$;

create or replace function public.actualizar_pedido(
  p_id uuid,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_tipo_entrega public.tipo_entrega,
  p_direccion text,
  p_referencia_ubicacion text,
  p_fecha_entrega date,
  p_hora_entrega time,
  p_adelanto numeric,
  p_metodo_pago_adelanto public.metodo_pago,
  p_costo_envio numeric,
  p_notas text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_pedido;
  v_es_admin boolean;
  v_subtotal numeric;
  v_envio numeric;
  v_resultado jsonb;
begin
  if not public.puede_gestionar_pedidos() then
    raise exception 'No autorizado para editar pedidos';
  end if;

  v_es_admin := public.es_rol(array['admin']::public.rol_usuario[]);

  select estado into v_estado from public.pedidos where id = p_id;
  if v_estado is null then
    raise exception 'No se encontró el pedido';
  end if;
  if v_estado in ('entregado', 'cancelado') and not v_es_admin then
    raise exception 'Solo un administrador puede editar un pedido entregado o cancelado';
  end if;

  update public.pedidos
  set
    cliente_nombre = trim(p_cliente_nombre),
    cliente_telefono = trim(p_cliente_telefono),
    tipo_entrega = p_tipo_entrega,
    direccion = case when p_tipo_entrega = 'envio' then nullif(trim(p_direccion), '') else null end,
    referencia_ubicacion = nullif(trim(p_referencia_ubicacion), ''),
    fecha_entrega = p_fecha_entrega,
    hora_entrega = p_hora_entrega,
    adelanto = coalesce(p_adelanto, 0),
    metodo_pago_adelanto = p_metodo_pago_adelanto,
    costo_envio = coalesce(p_costo_envio, 0),
    notas = nullif(trim(p_notas), '')
  where id = p_id;

  delete from public.pedido_items where pedido_id = p_id;
  v_subtotal := public.insertar_items_pedido(p_id, p_items);
  v_envio := coalesce(p_costo_envio, 0);

  if coalesce(p_adelanto, 0) > v_subtotal + v_envio then
    raise exception 'El adelanto no puede ser mayor al total';
  end if;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = p_id;

  return v_resultado;
end;
$$;

-- -----------------------------------------------------------------------------
-- cambiar_estado_pedido
-- -----------------------------------------------------------------------------
create or replace function public.estado_orden(p_estado public.estado_pedido)
returns integer
language sql
immutable
as $$
  select case p_estado
    when 'pendiente' then 1
    when 'en_produccion' then 2
    when 'listo' then 3
    when 'entregado' then 4
    else 0
  end;
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
    if v_rol not in ('admin', 'vendedor') then
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
  elsif v_rol = 'vendedor' then
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

-- -----------------------------------------------------------------------------
-- registrar_pago_saldo
-- -----------------------------------------------------------------------------
create or replace function public.registrar_pago_saldo(
  p_pedido_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo numeric;
  v_resultado jsonb;
begin
  if not public.puede_cobrar() then
    raise exception 'No autorizado para registrar cobros';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  select saldo into v_saldo from public.pedidos_con_totales where id = p_pedido_id;
  if v_saldo is null then
    raise exception 'No se encontró el pedido';
  end if;
  if p_monto > v_saldo then
    raise exception 'El cobro no puede superar el saldo (%)', v_saldo;
  end if;

  insert into public.pagos (pedido_id, monto, metodo, tipo, usuario_id)
  values (p_pedido_id, p_monto, p_metodo, 'saldo', auth.uid());

  if p_monto = v_saldo then
    update public.pedidos
    set metodo_pago_saldo = p_metodo, cobrado_en = now()
    where id = p_pedido_id;
  else
    update public.pedidos
    set metodo_pago_saldo = p_metodo
    where id = p_pedido_id;
  end if;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = p_pedido_id;

  return v_resultado;
end;
$$;

-- Entregas ya no necesita tocar adelanto; el cobro va a pagos
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

  if r in ('admin', 'vendedor') then
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

revoke all on function public.insertar_items_pedido(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.crear_pedido(text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.actualizar_pedido(uuid, text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido, text) to authenticated;
grant execute on function public.registrar_pago_saldo(uuid, numeric, public.metodo_pago) to authenticated;

-- Realtime
alter table public.pedido_historial replica identity full;
alter table public.pagos replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.pedido_historial;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pagos;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pedidos;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pedido_items;
  exception when duplicate_object then null;
  end;
end
$$;

commit;
