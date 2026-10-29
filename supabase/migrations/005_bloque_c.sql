-- =============================================================================
-- 005 Bloque C: reportes, usuarios admin, auditoría de permisos
-- Re-ejecutable. Una query nueva en el SQL Editor, DESPUÉS de 003 y 004.
-- =============================================================================

begin;

create or replace function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_rol(array['admin']::public.rol_usuario[]) then
    raise exception 'No autorizado';
  end if;
end;
$$;

create or replace function public.admin_reporte(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  perform public.exigir_admin();

  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango de fechas inválido';
  end if;

  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'pedidos', (
        select count(*)::int
        from public.pedidos
        where fecha_entrega between p_desde and p_hasta
          and estado <> 'cancelado'
      ),
      'unidades', (
        select coalesce(sum(pi.cantidad), 0)::int
        from public.pedido_items pi
        inner join public.pedidos p on p.id = pi.pedido_id
        where p.fecha_entrega between p_desde and p_hasta
          and p.estado <> 'cancelado'
      ),
      'ventas', (
        select coalesce(sum(t.total), 0)
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
      ),
      'adelantos', (
        select coalesce(sum(t.adelanto), 0)
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
      ),
      'cobros', (
        select coalesce(sum(t.pagos_saldo), 0)
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
      ),
      'saldo', (
        select coalesce(sum(t.saldo), 0)
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
      ),
      'ticket', (
        select case
          when count(*) = 0 then 0
          else round(coalesce(sum(t.total), 0) / count(*), 2)
        end
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
      ),
      'cancelados', (
        select count(*)::int
        from public.pedidos
        where fecha_entrega between p_desde and p_hasta
          and estado = 'cancelado'
      )
    ),
    'por_dia', coalesce((
      select jsonb_agg(row_to_json(d) order by d.fecha)
      from (
        select
          t.fecha_entrega as fecha,
          count(*)::int as pedidos,
          coalesce(sum(t.total), 0) as ventas,
          (
            select coalesce(sum(pi.cantidad), 0)::int
            from public.pedido_items pi
            inner join public.pedidos p2 on p2.id = pi.pedido_id
            where p2.fecha_entrega = t.fecha_entrega
              and p2.estado <> 'cancelado'
          ) as unidades
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
        group by t.fecha_entrega
      ) d
    ), '[]'::jsonb),
    'por_tipo', coalesce((
      select jsonb_agg(row_to_json(x) order by x.tipo)
      from (
        select
          t.tipo_entrega as tipo,
          count(*)::int as cantidad,
          coalesce(sum(t.total), 0) as ventas
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
        group by t.tipo_entrega
      ) x
    ), '[]'::jsonb),
    'por_estado', coalesce((
      select jsonb_agg(row_to_json(x) order by x.estado)
      from (
        select
          p.estado,
          count(*)::int as cantidad
        from public.pedidos p
        where p.fecha_entrega between p_desde and p_hasta
        group by p.estado
      ) x
    ), '[]'::jsonb),
    'productos', coalesce((
      select jsonb_agg(row_to_json(x) order by x.unidades desc)
      from (
        select
          coalesce(pr.nombre, pi.descripcion) as nombre,
          coalesce(pr.tamano, 'Otro') as tamano,
          sum(pi.cantidad)::int as unidades,
          sum(pi.cantidad * pi.precio_unitario) as ventas
        from public.pedido_items pi
        inner join public.pedidos p on p.id = pi.pedido_id
        left join public.productos pr on pr.id = pi.producto_id
        where p.fecha_entrega between p_desde and p_hasta
          and p.estado <> 'cancelado'
        group by coalesce(pr.nombre, pi.descripcion), coalesce(pr.tamano, 'Otro')
      ) x
    ), '[]'::jsonb),
    'por_cobrar', coalesce((
      select jsonb_agg(row_to_json(x) order by x.fecha_entrega, x.hora_entrega)
      from (
        select
          t.id,
          t.numero,
          t.numero_formateado,
          t.cliente_nombre,
          t.cliente_telefono,
          t.fecha_entrega,
          t.hora_entrega,
          t.estado,
          t.total,
          t.saldo
        from public.pedidos_con_totales t
        where t.fecha_entrega between p_desde and p_hasta
          and t.estado <> 'cancelado'
          and t.saldo > 0
      ) x
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$$;

create or replace function public.admin_exportar_pedidos(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.fecha_entrega, x.numero)
    from (
      select
        t.numero,
        t.numero_formateado,
        t.cliente_nombre,
        t.cliente_telefono,
        t.tipo_entrega,
        t.direccion,
        t.fecha_entrega,
        t.hora_entrega,
        t.estado,
        t.subtotal_items,
        t.costo_envio,
        t.total,
        t.adelanto,
        t.pagos_saldo,
        t.saldo,
        t.notas,
        t.created_at
      from public.pedidos_con_totales t
      where t.fecha_entrega between p_desde and p_hasta
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_exportar_items(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.numero, x.created_at)
    from (
      select
        p.numero,
        p.numero_formateado,
        p.fecha_entrega,
        pi.descripcion,
        pi.cantidad,
        pi.precio_unitario,
        (pi.cantidad * pi.precio_unitario) as subtotal,
        pi.notas_item,
        pi.created_at
      from public.pedido_items pi
      inner join public.pedidos p on p.id = pi.pedido_id
      where p.fecha_entrega between p_desde and p_hasta
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_exportar_pagos(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at)
    from (
      select
        p.numero,
        p.numero_formateado,
        p.fecha_entrega,
        pg.tipo,
        pg.metodo,
        pg.monto,
        pg.created_at
      from public.pagos pg
      inner join public.pedidos p on p.id = pg.pedido_id
      where p.fecha_entrega between p_desde and p_hasta
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_listar_usuarios()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at)
    from (
      select
        p.id,
        p.nombre,
        u.email::text as email,
        p.rol,
        p.activo,
        p.created_at
      from public.perfiles p
      inner join auth.users u on u.id = p.id
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_actualizar_perfil(
  p_id uuid,
  p_nombre text,
  p_rol public.rol_usuario,
  p_activo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actual public.perfiles;
  v_admins integer;
  v_resultado jsonb;
begin
  perform public.exigir_admin();

  select * into v_actual from public.perfiles where id = p_id;
  if v_actual.id is null then
    raise exception 'No se encontró el usuario';
  end if;

  if p_id = auth.uid() and p_rol is distinct from 'admin' then
    raise exception 'No puedes quitarte el rol de administrador';
  end if;

  if p_id = auth.uid() and p_activo is distinct from true then
    raise exception 'No puedes desactivar tu propia cuenta';
  end if;

  if v_actual.rol = 'admin' and (p_rol is distinct from 'admin' or p_activo is distinct from true) then
    select count(*)::int into v_admins
    from public.perfiles
    where rol = 'admin' and activo = true and id <> p_id;
    if v_admins < 1 then
      raise exception 'Debe quedar al menos un administrador activo';
    end if;
  end if;

  if nullif(trim(p_nombre), '') is null then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.perfiles
  set nombre = trim(p_nombre), rol = p_rol, activo = p_activo
  where id = p_id;

  select to_jsonb(x) into v_resultado
  from (
    select
      p.id,
      p.nombre,
      u.email::text as email,
      p.rol,
      p.activo,
      p.created_at
    from public.perfiles p
    inner join auth.users u on u.id = p.id
    where p.id = p_id
  ) x;

  return v_resultado;
end;
$$;

-- RLS: todas las tablas públicas
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_historial enable row level security;
alter table public.pagos enable row level security;

drop policy if exists pagos_select on public.pagos;
create policy pagos_select
  on public.pagos
  for select
  to authenticated
  using (public.es_activo());

-- Sin políticas de escritura en historial ni pagos: solo funciones DEFINER

-- Revocar acceso amplio
revoke all on all tables in schema public from anon, public;
revoke all on all sequences in schema public from anon, public;
revoke all on all functions in schema public from anon, public;

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.perfiles to authenticated;
grant select, insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert, update, delete on public.pedido_items to authenticated;
grant select on public.pedido_historial to authenticated;
grant select on public.pagos to authenticated;
grant select on public.pedidos_con_totales to authenticated;
grant usage, select on sequence public.pedidos_numero_seq to authenticated;

grant execute on function public.es_activo() to authenticated;
grant execute on function public.es_rol(public.rol_usuario[]) to authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.puede_gestionar_pedidos() to authenticated;
grant execute on function public.puede_cobrar() to authenticated;
grant execute on function public.crear_pedido(text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.actualizar_pedido(uuid, text, text, public.tipo_entrega, text, text, date, time, numeric, public.metodo_pago, numeric, text, jsonb) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido, text) to authenticated;
grant execute on function public.registrar_pago_saldo(uuid, numeric, public.metodo_pago) to authenticated;
grant execute on function public.admin_reporte(date, date) to authenticated;
grant execute on function public.admin_exportar_pedidos(date, date) to authenticated;
grant execute on function public.admin_exportar_items(date, date) to authenticated;
grant execute on function public.admin_exportar_pagos(date, date) to authenticated;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_actualizar_perfil(uuid, text, public.rol_usuario, boolean) to authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public revoke all on tables from public, anon;

commit;
