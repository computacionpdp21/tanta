# Panadería Janeth – Pedidos

Sistema de pedidos para la panadería de Santa Cruz de la Sierra. Sirve para tomar pedidos (tantawawas y pan), ver qué hay que hornear, cobrar y entregar, sin papeles sueltos.

Moneda: **bolivianos (Bs)**. Zona horaria: **America/La_Paz**.

## Qué puede hacer cada persona

| Rol | Para qué sirve |
| --- | --- |
| **Administración** | Ve todo: catálogo, resumen, usuarios y cualquier pedido. |
| **Ventas** | Crea y edita pedidos, cobra y cambia estados. |
| **Operativo** | Igual que ventas en pedidos y cobros, pero no ve catálogo, usuarios ni reportes. |
| **Producción** | Pantalla de cocina: cantidades por producto y botones Empezar / Listo. |
| **Entregas** | Ruta del día, marcar entregado y cobrar el saldo. |

Nadie sin sesión puede ver datos. Un usuario desactivado no entra.

## Cómo se arma el proyecto (una sola vez)

### 1. Código

Necesitas Node 20 o más. En la carpeta del proyecto:

```bash
npm install
```

Copia `.env.example` a `.env` y completa (nunca uses `service_role` aquí):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 2. Base de datos (Supabase → SQL Editor)

Ejecuta **cada archivo en una query nueva**, en este orden, y espera **Success**:

1. `supabase/schema.sql` — tablas, roles, catálogo de ejemplo, tiempo real.
2. `supabase/migrations/002_bloque_a.sql` — crear/editar pedido en una transacción.
3. `supabase/migrations/003_auditoria_y_estados.sql` — historial, pagos, cambiar estado y cobrar.
4. `supabase/migrations/004_rol_operativo.sql` — rol operativo (si falla el enum, corre primero `alter type public.rol_usuario add value if not exists 'operativo';` y después el resto).
5. `supabase/migrations/005_bloque_c.sql` — reportes, usuarios y cierre de permisos.
6. `supabase/migrations/006_cerrar_escrituras_directas.sql` — quita INSERT/UPDATE/DELETE de pedidos, ítems, pagos y perfiles. Solo quedan las RPC.

Consulta para comprobar el 005:

```sql
select 'funciones admin' as cosa, string_agg(routine_name, ', ') as resultado
from information_schema.routines
where routine_schema='public'
  and routine_name in ('admin_reporte','admin_listar_usuarios','admin_actualizar_perfil')
union all
select 'rls pagos', relrowsecurity::text
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='pagos';
```

Debes ver las 3 funciones y `true` en RLS de pagos.

Consulta para comprobar el 006 (los `*_insert/update/delete` deben ser `false`; `*_select` y `productos_update` `true`):

```sql
select
  has_table_privilege('authenticated', 'public.pedidos', 'UPDATE') as pedidos_update,
  has_table_privilege('authenticated', 'public.pedido_items', 'UPDATE') as items_update,
  has_table_privilege('authenticated', 'public.perfiles', 'UPDATE') as perfiles_update,
  has_table_privilege('authenticated', 'public.pagos', 'INSERT') as pagos_insert,
  has_table_privilege('authenticated', 'public.pedidos', 'SELECT') as pedidos_select,
  has_table_privilege('authenticated', 'public.productos', 'UPDATE') as productos_update;
```

### 3. Authentication (Supabase)

- Authentication → Providers → Email: **desactiva Confirm email**.
- Authentication → Providers: **desactiva el registro público** (Sign ups) para que nadie se cree una cuenta sola.
- Authentication → Users → Add user: correo, contraseña, Auto Confirm User.
- El perfil se crea solo (queda como vendedor). Para ser admin:

```sql
update public.perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'TU_CORREO');
```

Después puedes cambiar roles desde `/usuarios`.

### 4. Probar en tu computadora

```bash
npm run dev
```

Abre el enlace que muestra (por lo general `http://localhost:5173`).

## Subir a GitHub (repositorio PRIVADO)

Antes de cualquier `git add`, el archivo `.env` **no debe subirse**. Está en `.gitignore`.

```bash
git init
git add .
git status
```

En `git status` **no** debe aparecer `.env`. Si aparece, no hagas commit.

```bash
git commit -m "Panadería Janeth – Pedidos listo para usar"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/panaderia-janeth-pedidos.git
git push -u origin main
```

Crea el repo en github.com como **Private**. Cambia `TU_USUARIO` y el nombre si usas otro.

## Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. Add New → Project → importa el repo.
3. Preset: **Vite**.
4. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`  
   (las mismas del `.env`, nunca `service_role`)
5. Deploy.

Cuando tengas el link (ejemplo `https://janeth.vercel.app`):

1. Supabase → Authentication → URL Configuration.
2. **Site URL**: tu URL de Vercel.
3. **Redirect URLs**: la misma URL (puedes añadir `http://localhost:5173` para seguir probando en casa).
4. Prueba el login desde un celular.

## Instalar la app en el celular (PWA)

- **Android (Chrome):** aviso “Instalar app”, o menú → Instalar aplicación.
- **iPhone (Safari):** Compartir → Añadir a pantalla de inicio. No uses Chrome en iPhone para instalarla.

El logo provisional está en `public/logo.svg` y `public/icons/`. Para el logo real, reemplaza esos archivos (o corre `npm run icons` si usas el dibujo generado).

## Operación diaria

- Ventas carga pedidos. Producción mira `/produccion`. Entregas cobra y marca entregado.
- **Respaldo:** en `/resumen` (solo admin) → Exportar CSV. Ábrelo en Excel (lleva BOM UTF-8 para los acentos). Hazlo cada semana en temporada.
- El plan gratis de Supabase **pausa el proyecto si nadie entra en una semana**. Entra al dashboard y pulsa Restore. Mientras esté pausado, la app no carga.
- Precios: `/productos`. El precio del catálogo es sugerido; en cada pedido se puede cambiar.
- Usuarios: `/usuarios` (cambiar rol o desactivar). Crear cuentas y resetear contraseñas de otros: panel de Supabase → Authentication → Users.
- Cada persona cambia **su** contraseña en **Mi cuenta**.

## Antes de usar el sistema de verdad

Checklist:

- [ ] Cambiar las contraseñas débiles (incluida la del correo de administración).
- [ ] Correr `supabase/limpiar_datos_prueba.sql` para que el primer pedido real sea el **#001**.
- [ ] Revisar productos y precios reales en el catálogo.
- [ ] Asignar roles (Mateo → operativo, panaderos → producción, etc.).
- [ ] Probar con dos celulares: uno carga un pedido y el otro lo ve en Producción.
- [ ] Poner la URL de Vercel en Supabase (Site URL y Redirect URLs).
- [ ] Instalar la PWA y crear un pedido de prueba final, luego borrarlo o limpiar de nuevo.

## Si algo falla

| Problema | Qué revisar |
| --- | --- |
| No entra (login) | Confirm email desactivado; usuario Auto Confirm; Site URL de Vercel; correo y contraseña. |
| No aparecen pedidos | Migraciones 003–006 corridas; el usuario está **activo**; filtro de fechas en la lista. |
| No llega el tiempo real | En Supabase, Replication / Realtime: tablas `pedidos`, `pedido_items`, `pedido_historial`. |
| Error de RLS / No autorizado | El rol no puede esa acción (ej. producción no cancela). Revisa 005–006. |
| “permission denied” al guardar un pedido | El 006 está bien: la app debe usar RPC, no `from('pedidos').update`. Recarga la PWA. |
| La PWA no se actualiza | Aviso “Hay una actualización”; o cierra la app y ábrela de nuevo. En Chrome: Ajustes del sitio → borrar datos. |
| Excel abre el CSV raro | Usa el botón Exportar CSV de `/resumen` (no copies a mano). Debe abrirse con tildes bien. |

## Comandos útiles

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
npm run icons
```
