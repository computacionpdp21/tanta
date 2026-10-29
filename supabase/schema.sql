-- =============================================================================
-- Panadería Janeth – Pedidos
-- Postgres + Auth + RLS + Realtime (Supabase)
-- Zona horaria de negocio: America/La_Paz · Moneda: Bolivianos (Bs)
-- =============================================================================
-- Cómo aplicar: SQL Editor del proyecto Supabase → pegar y ejecutar este archivo.
-- Cada usuario de Auth recibe un perfil con rol 'vendedor'. Para ser admin:
--   update public.perfiles set rol = 'admin' where id = (
--     select id from auth.users where email = 'TU_EMAIL'
--   );
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_usuario') then
    create type public.rol_usuario as enum ('admin', 'vendedor', 'produccion', 'entregas');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_entrega') then
    create type public.tipo_entrega as enum ('recojo', 'envio');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_pedido') then
    create type public.estado_pedido as enum (
      'pendiente',
      'en_produccion',
      'listo',
      'entregado',
      'cancelado'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'metodo_pago') then
    create type public.metodo_pago as enum ('efectivo', 'qr', 'transferencia');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Función: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabla: perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol public.rol_usuario not null default 'vendedor',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: productos (catálogo)
-- -----------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tamano text not null,
  precio_base numeric(10, 2) not null check (precio_base >= 0),
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint productos_nombre_tamano_unique unique (nombre, tamano)
);

drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: pedidos
-- -----------------------------------------------------------------------------
create sequence if not exists public.pedidos_numero_seq start with 1 increment by 1;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.pedidos_numero_seq'),
  numero_formateado text generated always as ('#' || lpad(numero::text, 3, '0')) stored,
  cliente_nombre text not null,
  cliente_telefono text not null,
  tipo_entrega public.tipo_entrega not null,
  direccion text,
  referencia_ubicacion text,
  fecha_entrega date not null,
  hora_entrega time,
  estado public.estado_pedido not null default 'pendiente',
  adelanto numeric(10, 2) not null default 0 check (adelanto >= 0),
  metodo_pago_adelanto public.metodo_pago,
  costo_envio numeric(10, 2) not null default 0 check (costo_envio >= 0),
  notas text,
  metodo_pago_saldo public.metodo_pago,
  cobrado_en timestamptz,
  creado_por uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedidos_direccion_envio check (
    tipo_entrega = 'recojo'
    or (direccion is not null and length(trim(direccion)) > 0)
  ),
  constraint pedidos_adelanto_metodo check (
    adelanto = 0 or metodo_pago_adelanto is not null
  )
);

alter sequence public.pedidos_numero_seq owned by public.pedidos.numero;

drop trigger if exists trg_pedidos_updated_at on public.pedidos;
create trigger trg_pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: pedido_items
-- -----------------------------------------------------------------------------
create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  descripcion text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0),
  notas_item text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_pedido_items_updated_at on public.pedido_items;
create trigger trg_pedido_items_updated_at
  before update on public.pedido_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: pedido_historial (cambios de estado)
-- -----------------------------------------------------------------------------
create table if not exists public.pedido_historial (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  estado_anterior public.estado_pedido,
  estado_nuevo public.estado_pedido not null,
  cambiado_por uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_pedidos_fecha_entrega on public.pedidos (fecha_entrega);
create index if not exists idx_pedidos_estado on public.pedidos (estado);
create index if not exists idx_pedidos_fecha_estado on public.pedidos (fecha_entrega, estado);
create index if not exists idx_pedidos_tipo_entrega on public.pedidos (tipo_entrega);
create index if not exists idx_pedidos_cliente_nombre on public.pedidos using gin (to_tsvector('simple', cliente_nombre));
create index if not exists idx_pedidos_cliente_telefono on public.pedidos (cliente_telefono);
create index if not exists idx_pedido_items_pedido_id on public.pedido_items (pedido_id);
create index if not exists idx_pedido_items_producto_id on public.pedido_items (producto_id);
create index if not exists idx_pedido_historial_pedido_id on public.pedido_historial (pedido_id, created_at);
create index if not exists idx_productos_activo_orden on public.productos (activo, orden);
create index if not exists idx_perfiles_rol on public.perfiles (rol);

-- -----------------------------------------------------------------------------
-- Vista: totales y saldo (no se duplican en la tabla)
-- total = suma(cantidad × precio_unitario) + costo_envio
-- saldo = total − adelanto
-- security_invoker: aplica RLS de las tablas base
-- -----------------------------------------------------------------------------
create or replace view public.pedidos_con_totales
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
  (coalesce(i.subtotal, 0) + p.costo_envio - p.adelanto)::numeric(12, 2) as saldo
from public.pedidos p
left join (
  select
    pedido_id,
    sum(cantidad * precio_unitario) as subtotal
  from public.pedido_items
  group by pedido_id
) i on i.pedido_id = p.id;

-- -----------------------------------------------------------------------------
-- Helpers de autorización (security definer para evitar recursión en RLS)
-- -----------------------------------------------------------------------------
create or replace function public.es_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles
    where id = auth.uid()
      and activo = true
  );
$$;

create or replace function public.es_rol(roles public.rol_usuario[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles
    where id = auth.uid()
      and activo = true
      and rol = any (roles)
  );
$$;

create or replace function public.mi_rol()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol
  from public.perfiles
  where id = auth.uid()
    and activo = true;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: crear perfil al registrar usuario (rol por defecto: vendedor)
-- El rol admin solo se asigna a mano en el SQL Editor, no desde el registro.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo_nombre text;
begin
  nuevo_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.perfiles (id, nombre, rol, activo)
  values (new.id, nuevo_nombre, 'vendedor', true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.perfiles (id, nombre, rol, activo)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''),
    split_part(u.email, '@', 1)
  ),
  'vendedor',
  true
from auth.users u
where not exists (select 1 from public.perfiles p where p.id = u.id);

-- -----------------------------------------------------------------------------
-- Trigger: historial de estados
-- -----------------------------------------------------------------------------
create or replace function public.registrar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pedido_historial (pedido_id, estado_anterior, estado_nuevo, cambiado_por)
    values (new.id, null, new.estado, coalesce(new.creado_por, auth.uid()));
    return new;
  end if;

  if tg_op = 'UPDATE' and old.estado is distinct from new.estado then
    insert into public.pedido_historial (pedido_id, estado_anterior, estado_nuevo, cambiado_por)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedidos_historial on public.pedidos;
create trigger trg_pedidos_historial
  after insert or update of estado on public.pedidos
  for each row execute function public.registrar_cambio_estado();

-- -----------------------------------------------------------------------------
-- Trigger: restricciones de columnas según rol
-- admin/vendedor: todo
-- produccion: solo estado (pendiente / en_produccion / listo)
-- entregas: estado entregado + cobro del saldo (adelanto, metodo_pago_saldo, cobrado_en)
-- -----------------------------------------------------------------------------
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
      or new.metodo_pago_saldo is distinct from old.metodo_pago_saldo
      or new.cobrado_en is distinct from old.cobrado_en
      or new.numero is distinct from old.numero
      or new.creado_por is distinct from old.creado_por
    then
      raise exception 'Producción solo puede cambiar el estado del pedido';
    end if;

    return new;
  end if;

  if r = 'entregas' then
    if old.estado = 'cancelado' then
      raise exception 'No se puede entregar un pedido cancelado';
    end if;

    if new.estado not in (old.estado, 'entregado') then
      raise exception 'Entregas solo puede marcar como Entregado';
    end if;

    if new.adelanto < old.adelanto then
      raise exception 'No se puede reducir el adelanto';
    end if;

    if new.cliente_nombre is distinct from old.cliente_nombre
      or new.cliente_telefono is distinct from old.cliente_telefono
      or new.tipo_entrega is distinct from old.tipo_entrega
      or new.direccion is distinct from old.direccion
      or new.referencia_ubicacion is distinct from old.referencia_ubicacion
      or new.fecha_entrega is distinct from old.fecha_entrega
      or new.hora_entrega is distinct from old.hora_entrega
      or new.costo_envio is distinct from old.costo_envio
      or new.notas is distinct from old.notas
      or new.numero is distinct from old.numero
      or new.creado_por is distinct from old.creado_por
      or new.metodo_pago_adelanto is distinct from old.metodo_pago_adelanto
    then
      raise exception 'Entregas solo puede marcar entregado y registrar el cobro';
    end if;

    return new;
  end if;

  raise exception 'No autorizado';
end;
$$;

drop trigger if exists trg_pedidos_enforce_rol on public.pedidos;
create trigger trg_pedidos_enforce_rol
  before update on public.pedidos
  for each row execute function public.enforce_pedido_update_por_rol();

-- -----------------------------------------------------------------------------
-- Función de apoyo: resumen de producción por fecha
-- -----------------------------------------------------------------------------
create or replace function public.resumen_produccion(p_fecha date)
returns table (
  producto_id uuid,
  nombre text,
  tamano text,
  cantidad_total bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    pi.producto_id,
    coalesce(pr.nombre, pi.descripcion) as nombre,
    coalesce(pr.tamano, 'Otro') as tamano,
    sum(pi.cantidad)::bigint as cantidad_total
  from public.pedido_items pi
  inner join public.pedidos p on p.id = pi.pedido_id
  left join public.productos pr on pr.id = pi.producto_id
  where p.fecha_entrega = p_fecha
    and p.estado <> 'cancelado'
  group by pi.producto_id, coalesce(pr.nombre, pi.descripcion), coalesce(pr.tamano, 'Otro')
  order by nombre, tamano;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_historial enable row level security;

-- Limpia políticas si se re-ejecuta el script
drop policy if exists perfiles_select on public.perfiles;
drop policy if exists perfiles_update_admin on public.perfiles;
drop policy if exists perfiles_update_propio_nombre on public.perfiles;

drop policy if exists productos_select on public.productos;
drop policy if exists productos_write_admin on public.productos;

drop policy if exists pedidos_select on public.pedidos;
drop policy if exists pedidos_insert on public.pedidos;
drop policy if exists pedidos_update on public.pedidos;
drop policy if exists pedidos_delete_admin on public.pedidos;

drop policy if exists pedido_items_select on public.pedido_items;
drop policy if exists pedido_items_write on public.pedido_items;

drop policy if exists pedido_historial_select on public.pedido_historial;

-- perfiles
create policy perfiles_select
  on public.perfiles
  for select
  to authenticated
  using (public.es_activo());

create policy perfiles_update_admin
  on public.perfiles
  for update
  to authenticated
  using (public.es_rol(array['admin']::public.rol_usuario[]))
  with check (public.es_rol(array['admin']::public.rol_usuario[]));

-- productos
create policy productos_select
  on public.productos
  for select
  to authenticated
  using (public.es_activo());

create policy productos_write_admin
  on public.productos
  for all
  to authenticated
  using (public.es_rol(array['admin']::public.rol_usuario[]))
  with check (public.es_rol(array['admin']::public.rol_usuario[]));

-- pedidos
create policy pedidos_select
  on public.pedidos
  for select
  to authenticated
  using (public.es_activo());

create policy pedidos_insert
  on public.pedidos
  for insert
  to authenticated
  with check (public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]));

create policy pedidos_update
  on public.pedidos
  for update
  to authenticated
  using (
    public.es_rol(array['admin', 'vendedor', 'produccion', 'entregas']::public.rol_usuario[])
  )
  with check (
    public.es_rol(array['admin', 'vendedor', 'produccion', 'entregas']::public.rol_usuario[])
  );

create policy pedidos_delete_admin
  on public.pedidos
  for delete
  to authenticated
  using (public.es_rol(array['admin']::public.rol_usuario[]));

-- pedido_items
create policy pedido_items_select
  on public.pedido_items
  for select
  to authenticated
  using (public.es_activo());

create policy pedido_items_write
  on public.pedido_items
  for all
  to authenticated
  using (public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]))
  with check (public.es_rol(array['admin', 'vendedor']::public.rol_usuario[]));

-- historial (solo lectura; los inserts los hace el trigger definer)
create policy pedido_historial_select
  on public.pedido_historial
  for select
  to authenticated
  using (public.es_activo());

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.perfiles to authenticated;
grant select, insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert, update, delete on public.pedido_items to authenticated;
grant select on public.pedido_historial to authenticated;
grant select on public.pedidos_con_totales to authenticated;
grant usage, select on sequence public.pedidos_numero_seq to authenticated;
grant execute on function public.es_activo() to authenticated;
grant execute on function public.es_rol(public.rol_usuario[]) to authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.resumen_produccion(date) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
alter table public.pedidos replica identity full;
alter table public.pedido_items replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.pedidos;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pedido_items;
  exception
    when duplicate_object then null;
  end;
end
$$;

-- -----------------------------------------------------------------------------
-- Semilla: catálogo editable (tantawawas y otros productos de Todos Santos)
-- Precios base de ejemplo en Bs; se ajustan desde la app.
-- -----------------------------------------------------------------------------
insert into public.productos (nombre, tamano, precio_base, activo, orden)
values
  ('Tantawawa', 'Pequeña', 15.00, true, 10),
  ('Tantawawa', 'Mediana', 25.00, true, 20),
  ('Tantawawa', 'Grande', 40.00, true, 30),
  ('Tantawawa', 'Extra grande', 60.00, true, 40),
  ('Caballito', 'Único', 12.00, true, 50),
  ('Escalera', 'Única', 15.00, true, 60),
  ('Pan de canela', 'Único', 8.00, true, 70),
  ('Pan marraqueta', 'Unidad', 1.50, true, 80),
  ('Torta', 'Personalizada', 80.00, true, 90)
on conflict (nombre, tamano) do update
set
  precio_base = excluded.precio_base,
  activo = excluded.activo,
  orden = excluded.orden;

-- Después de crear tu usuario en Authentication, asígnate admin (cambia el email):
-- update public.perfiles set rol = 'admin' where id = (
--   select id from auth.users where email = 'TU_EMAIL'
-- );

commit;
