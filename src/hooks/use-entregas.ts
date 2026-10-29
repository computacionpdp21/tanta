import { useQuery } from "@tanstack/react-query";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import { asRecordArray, mapPedidoConTotales, mapPedidoItem } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";
import type { PedidoConTotales, PedidoItem } from "@/types/database";

export function useEntregasPorFecha(fecha: string) {
  return useQuery({
    queryKey: ["entregas", fecha],
    enabled: Boolean(fecha),
    queryFn: async (): Promise<{
      pedidos: PedidoConTotales[];
      items: PedidoItem[];
    }> => {
      const client = requireSupabase();
      const { data: pedidos, error: pedidosError } = await client
        .from("pedidos_con_totales")
        .select("*")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega", { ascending: true, nullsFirst: false });
      if (pedidosError) throw new Error(mensajeErrorSupabase(pedidosError));

      const mapped = asRecordArray(pedidos).map(mapPedidoConTotales);
      const ids = mapped.map((pedido) => pedido.id);
      if (ids.length === 0) {
        return { pedidos: [], items: [] };
      }

      const { data: items, error: itemsError } = await client
        .from("pedido_items")
        .select("*")
        .in("pedido_id", ids)
        .order("created_at");
      if (itemsError) throw new Error(mensajeErrorSupabase(itemsError));

      return { pedidos: mapped, items: asRecordArray(items).map(mapPedidoItem) };
    },
  });
}
