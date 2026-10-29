-- =============================================================================
-- ADVERTENCIA: ESTE SCRIPT BORRA TODOS LOS PEDIDOS
-- No forma parte de las migraciones. Córrelo SOLO cuando vayas a usar el
-- sistema de verdad y quieras que el primer pedido real sea el #001.
-- NO toca perfiles ni productos.
-- =============================================================================

begin;

delete from public.pagos;
delete from public.pedido_historial;
delete from public.pedido_items;
delete from public.pedidos;

alter sequence public.pedidos_numero_seq restart with 1;

commit;
