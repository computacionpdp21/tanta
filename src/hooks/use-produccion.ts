import { useQuery } from "@tanstack/react-query";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import { asRecordArray, mapPedidoConTotales, mapPedidoItemConProducto } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";
import type { PedidoConTotales, PedidoItemConProducto } from "@/types/database";

export interface TamanoConsolidado {
  tamano: string;
  cantidad: number;
}

export interface GrupoProduccion {
  nombre: string;
  tamanos: TamanoConsolidado[];
  total: number;
}

export interface OtroProduccion {
  descripcion: string;
  cantidad: number;
}

export interface ConsolidadoProduccion {
  grupos: GrupoProduccion[];
  otros: OtroProduccion[];
  totalUnidades: number;
}

const ORDEN_TAMANO = ["Extra grande", "Grande", "Mediana", "Pequeña", "Único", "Única", "Unidad", "Personalizada"];

function ordenTamano(tamano: string): number {
  const idx = ORDEN_TAMANO.indexOf(tamano);
  return idx === -1 ? 50 + tamano.localeCompare("M") : idx;
}

export function consolidarProduccion(items: PedidoItemConProducto[]): ConsolidadoProduccion {
  const grupos = new Map<string, Map<string, number>>();
  const otrosMap = new Map<string, number>();
  let totalUnidades = 0;

  for (const item of items) {
    totalUnidades += item.cantidad;
    const esOtro = !item.producto_id || !item.producto_nombre;
    if (esOtro) {
      otrosMap.set(item.descripcion, (otrosMap.get(item.descripcion) ?? 0) + item.cantidad);
      continue;
    }
    const nombre = item.producto_nombre ?? item.descripcion;
    const tamano = item.producto_tamano ?? "Único";
    const porTamano = grupos.get(nombre) ?? new Map<string, number>();
    porTamano.set(tamano, (porTamano.get(tamano) ?? 0) + item.cantidad);
    grupos.set(nombre, porTamano);
  }

  const gruposList: GrupoProduccion[] = [...grupos.entries()]
    .map(([nombre, tamanos]) => {
      const lista = [...tamanos.entries()]
        .map(([tamano, cantidad]) => ({ tamano, cantidad }))
        .sort((a, b) => ordenTamano(a.tamano) - ordenTamano(b.tamano) || a.tamano.localeCompare(b.tamano));
      return {
        nombre,
        tamanos: lista,
        total: lista.reduce((sum, item) => sum + item.cantidad, 0),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const otros = [...otrosMap.entries()]
    .map(([descripcion, cantidad]) => ({ descripcion, cantidad }))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));

  return { grupos: gruposList, otros, totalUnidades };
}

export function useProduccionPorFecha(fecha: string) {
  return useQuery({
    queryKey: ["produccion", fecha],
    enabled: Boolean(fecha),
    queryFn: async (): Promise<{
      pedidos: PedidoConTotales[];
      items: PedidoItemConProducto[];
    }> => {
      const client = requireSupabase();
      const { data: pedidos, error: pedidosError } = await client
        .from("pedidos_con_totales")
        .select("*")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega", { ascending: true, nullsFirst: false });
      if (pedidosError) throw new Error(mensajeErrorSupabase(pedidosError));

      const mappedPedidos = asRecordArray(pedidos).map(mapPedidoConTotales);
      const pedidoIds = mappedPedidos.map((pedido) => pedido.id);
      if (pedidoIds.length === 0) {
        return { pedidos: [], items: [] };
      }

      const { data: items, error: itemsError } = await client
        .from("pedido_items")
        .select("*, producto:productos(nombre, tamano)")
        .in("pedido_id", pedidoIds)
        .order("created_at");
      if (itemsError) throw new Error(mensajeErrorSupabase(itemsError));

      return {
        pedidos: mappedPedidos,
        items: asRecordArray(items).map(mapPedidoItemConProducto),
      };
    },
  });
}
