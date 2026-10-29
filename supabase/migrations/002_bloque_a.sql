-- =============================================================================
-- Bloque A (Fases 2 y 3)
-- Re-ejecutable. Pegar en SQL Editor de Supabase y pulsar Run.
-- =============================================================================

begin;

-- Permite leer el propio perfil aunque esté inactivo (para mostrar el mensaje
-- de cuenta desactivada). Los activos siguen viendo todos los perfiles.
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select
  on public.perfiles
  for select
  to authenticated
  using (id = auth.uid() or public.es_activo());

-- No borrar un producto que ya está en pedidos; desactivarlo desde la app.
create or replace function public.evitar_borrar_producto_en_uso()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.pedido_items where producto_id = old.id
  ) then
    raise exception 'No se puede borrar un producto que ya está en pedidos. Desactívalo.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_productos_evitar_borrar on public.productos;
create trigger trg_productos_evitar_borrar
  before delete on public.productos
  for each row execute function public.evitar_borrar_producto_en_uso();

-- -----------------------------------------------------------------------------
-- crear_pedido: pedido + ítems en una transacción
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
security invoker
set search_path = public
as $$
declare
  v_pedido public.pedidos;
  v_item jsonb;
  v_descripcion text;
  v_cantidad integer;
  v_precio numeric;
  v_resultado jsonb;
begin
  if not public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]) then
    raise exception 'No autorizado para crear pedidos';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'El pedido debe tener al menos un ítem';
  end if;

  insert into public.pedidos (
    cliente_nombre,
    cliente_telefono,
    tipo_entrega,
    direccion,
    referencia_ubicacion,
    fecha_entrega,
    hora_entrega,
    adelanto,
    metodo_pago_adelanto,
    costo_envio,
    notas,
    creado_por
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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_descripcion := nullif(trim(v_item ->> 'descripcion'), '');
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 0);
    v_precio := coalesce((v_item ->> 'precio_unitario')::numeric, -1);

    if v_descripcion is null then
      raise exception 'Cada ítem necesita una descripción';
    end if;
    if v_cantidad < 1 then
      raise exception 'La cantidad debe ser al menos 1';
    end if;
    if v_precio < 0 then
      raise exception 'El precio unitario no puede ser negativo';
    end if;

    insert into public.pedido_items (
      pedido_id,
      producto_id,
      descripcion,
      cantidad,
      precio_unitario,
      notas_item
    ) values (
      v_pedido.id,
      nullif(v_item ->> 'producto_id', '')::uuid,
      v_descripcion,
      v_cantidad,
      v_precio,
      nullif(trim(v_item ->> 'notas_item'), '')
    );
  end loop;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = v_pedido.id;

  return v_resultado;
end;
$$;

-- -----------------------------------------------------------------------------
-- actualizar_pedido: reemplaza ítems de forma segura
-- -----------------------------------------------------------------------------
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
security invoker
set search_path = public
as $$
declare
  v_estado public.estado_pedido;
  v_item jsonb;
  v_descripcion text;
  v_cantidad integer;
  v_precio numeric;
  v_resultado jsonb;
begin
  if not public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]) then
    raise exception 'No autorizado para editar pedidos';
  end if;

  select estado into v_estado from public.pedidos where id = p_id;
  if v_estado is null then
    raise exception 'No se encontró el pedido';
  end if;
  if v_estado in ('entregado', 'cancelado') then
    raise exception 'No se puede editar un pedido entregado o cancelado';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'El pedido debe tener al menos un ítem';
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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_descripcion := nullif(trim(v_item ->> 'descripcion'), '');
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 0);
    v_precio := coalesce((v_item ->> 'precio_unitario')::numeric, -1);

    if v_descripcion is null then
      raise exception 'Cada ítem necesita una descripción';
    end if;
    if v_cantidad < 1 then
      raise exception 'La cantidad debe ser al menos 1';
    end if;
    if v_precio < 0 then
      raise exception 'El precio unitario no puede ser negativo';
    end if;

    insert into public.pedido_items (
      pedido_id,
      producto_id,
      descripcion,
      cantidad,
      precio_unitario,
      notas_item
    ) values (
      p_id,
      nullif(v_item ->> 'producto_id', '')::uuid,
      v_descripcion,
      v_cantidad,
      v_precio,
      nullif(trim(v_item ->> 'notas_item'), '')
    );
  end loop;

  select to_jsonb(t) into v_resultado
  from public.pedidos_con_totales t
  where t.id = p_id;

  return v_resultado;
end;
$$;

grant execute on function public.crear_pedido(
  text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb
) to authenticated;

grant execute on function public.actualizar_pedido(
  uuid, text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb
) to authenticated;

commit;
