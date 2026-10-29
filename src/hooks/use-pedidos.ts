import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNombresUsuarios } from "@/hooks/use-nombres";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import {
  asRecord,
  asRecordArray,
  mapPedidoCompleto,
  mapPedidoConTotales,
} from "@/lib/mappers";
import type { PedidosFiltros } from "@/lib/pedidos-filtros";
import { sanitizarBusqueda } from "@/lib/pedidos-filtros";
import { silenciarRealtime } from "@/lib/realtime";
import { requireSupabase } from "@/lib/supabase";
import type {
  EstadoPedido,
  MetodoPago,
  PedidoCompleto,
  PedidoConTotales,
  TipoEntrega,
} from "@/types/database";

export const PEDIDOS_PAGE_SIZE = 20;

export interface PedidoItemPayload {
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  notas_item: string | null;
}

export interface PedidoPayload {
  id?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_entrega: TipoEntrega;
  direccion: string | null;
  referencia_ubicacion: string | null;
  fecha_entrega: string;
  hora_entrega: string | null;
  adelanto: number;
  metodo_pago_adelanto: MetodoPago | null;
  costo_envio: number;
  notas: string | null;
  items: PedidoItemPayload[];
}

function aplicarFiltros<
  T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
    eq: (column: string, value: string) => T;
    in: (column: string, values: readonly string[]) => T;
    neq: (column: string, value: string) => T;
    or: (filters: string) => T;
  },
>(query: T, filtros: PedidosFiltros): T {
  let next = query;
  if (filtros.desde) next = next.gte("fecha_entrega", filtros.desde);
  if (filtros.hasta) next = next.lte("fecha_entrega", filtros.hasta);
  if (filtros.tipo) next = next.eq("tipo_entrega", filtros.tipo);

  if (filtros.estados.length > 0) {
    const estados = filtros.cancelados
      ? [...new Set([...filtros.estados, "cancelado" as const])]
      : filtros.estados.filter((estado) => estado !== "cancelado");
    if (estados.length > 0) next = next.in("estado", estados);
  } else if (!filtros.cancelados) {
    next = next.neq("estado", "cancelado");
  }

  const q = sanitizarBusqueda(filtros.q);
  if (q) {
    next = next.or(
      `cliente_nombre.ilike.%${q}%,cliente_telefono.ilike.%${q}%,numero_formateado.ilike.%${q}%`,
    );
  }

  return next;
}

async function fetchPedidosPagina(
  filtros: PedidosFiltros,
  from: number,
  to: number,
  extra?: { fechaEq?: string; fechaLt?: string; fechaGt?: string },
): Promise<{ rows: PedidoConTotales[]; count: number }> {
  const client = requireSupabase();
  let query = client.from("pedidos_con_totales").select("*", { count: "exact" });
  query = aplicarFiltros(query, filtros);
  if (extra?.fechaEq) query = query.eq("fecha_entrega", extra.fechaEq);
  if (extra?.fechaLt) query = query.lt("fecha_entrega", extra.fechaLt);
  if (extra?.fechaGt) query = query.gt("fecha_entrega", extra.fechaGt);

  const { data, error, count } = await query
    .order("fecha_entrega", { ascending: true })
    .order("hora_entrega", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (error) throw new Error(mensajeErrorSupabase(error));
  return { rows: asRecordArray(data).map(mapPedidoConTotales), count: count ?? 0 };
}

export function usePedidosInfinitos(filtros: PedidosFiltros, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["pedidos", "lista", filtros],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchPedidosPagina(filtros, pageParam, pageParam + PEDIDOS_PAGE_SIZE - 1),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.rows.length, 0);
      if (loaded >= lastPage.count) return undefined;
      return loaded;
    },
  });
}

export function usePedidosSeccion(
  filtros: PedidosFiltros,
  extra: { fechaEq?: string; fechaLt?: string; fechaGt?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["pedidos", "seccion", filtros, extra],
    enabled,
    queryFn: () => fetchPedidosPagina(filtros, 0, 99, extra),
  });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ["pedidos", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<PedidoCompleto | null> => {
      if (!id) return null;
      const client = requireSupabase();

      const { data: pedido, error: pedidoError } = await client
        .from("pedidos_con_totales")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (pedidoError) throw new Error(mensajeErrorSupabase(pedidoError));
      const pedidoRow = asRecord(pedido);
      if (!pedidoRow) return null;

      const [
        { data: items, error: itemsError },
        { data: historial, error: historialError },
        { data: pagos, error: pagosError },
      ] = await Promise.all([
        client.from("pedido_items").select("*").eq("pedido_id", id).order("created_at"),
        client
          .from("pedido_historial")
          .select("*")
          .eq("pedido_id", id)
          .order("created_at", { ascending: true }),
        client.from("pagos").select("*").eq("pedido_id", id).order("created_at"),
      ]);

      if (itemsError) throw new Error(mensajeErrorSupabase(itemsError));
      if (historialError) throw new Error(mensajeErrorSupabase(historialError));
      if (pagosError) throw new Error(mensajeErrorSupabase(pagosError));

      const historialRows = asRecordArray(historial);
      const pagosRows = asRecordArray(pagos);
      const nombres = await fetchNombresUsuarios([
        ...historialRows.map((row) => (typeof row.cambiado_por === "string" ? row.cambiado_por : "")),
        ...pagosRows.map((row) => (typeof row.usuario_id === "string" ? row.usuario_id : "")),
      ]);

      return mapPedidoCompleto(pedidoRow, asRecordArray(items), historialRows, pagosRows, nombres);
    },
  });
}

export function useGuardarPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PedidoPayload): Promise<PedidoConTotales> => {
      const client = requireSupabase();
      const args = {
        p_cliente_nombre: payload.cliente_nombre,
        p_cliente_telefono: payload.cliente_telefono,
        p_tipo_entrega: payload.tipo_entrega,
        p_direccion: payload.direccion,
        p_referencia_ubicacion: payload.referencia_ubicacion,
        p_fecha_entrega: payload.fecha_entrega,
        p_hora_entrega: payload.hora_entrega,
        p_adelanto: payload.adelanto,
        p_metodo_pago_adelanto: payload.metodo_pago_adelanto,
        p_costo_envio: payload.costo_envio,
        p_notas: payload.notas,
        p_items: payload.items,
      };

      const { data, error } = payload.id
        ? await client.rpc("actualizar_pedido", { p_id: payload.id, ...args })
        : await client.rpc("crear_pedido", args);

      if (error) throw new Error(mensajeErrorSupabase(error));
      const row = asRecord(data);
      if (!row) throw new Error("No se recibió el pedido guardado.");
      const pedido = mapPedidoConTotales(row);
      silenciarRealtime(pedido.id);
      return pedido;
    },
    onSuccess: async (pedido) => {
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      await queryClient.invalidateQueries({ queryKey: ["pedidos", pedido.id] });
      await queryClient.invalidateQueries({ queryKey: ["produccion"] });
      await queryClient.invalidateQueries({ queryKey: ["entregas"] });
    },
  });
}

function patchEstadoEnCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  estado: EstadoPedido,
) {
  queryClient.setQueriesData({ queryKey: ["pedidos"] }, (current: unknown) =>
    parchearPedidos(current, id, { estado }),
  );
  queryClient.setQueriesData({ queryKey: ["produccion"] }, (current: unknown) =>
    parchearProduccion(current, id, { estado }),
  );
  queryClient.setQueriesData({ queryKey: ["entregas"] }, (current: unknown) =>
    parchearLista(current, id, { estado }),
  );
}

function parchearLista(
  current: unknown,
  id: string,
  patch: Partial<PedidoConTotales>,
): unknown {
  if (!Array.isArray(current)) return current;
  return current.map((item) => {
    const row = asRecord(item);
    if (!row || row.id !== id) return item;
    return { ...item, ...patch };
  });
}

function parchearPedidos(current: unknown, id: string, patch: Partial<PedidoConTotales>): unknown {
  if (!current || typeof current !== "object") return current;
  const record = current as Record<string, unknown>;
  if (Array.isArray(record.pages)) {
    return {
      ...record,
      pages: record.pages.map((page) => {
        const pageRecord = asRecord(page);
        if (!pageRecord || !Array.isArray(pageRecord.rows)) return page;
        return {
          ...pageRecord,
          rows: parchearLista(pageRecord.rows, id, patch),
        };
      }),
    };
  }
  if (Array.isArray(record.rows)) {
    return { ...record, rows: parchearLista(record.rows, id, patch) };
  }
  if (typeof record.id === "string" && record.id === id) {
    return { ...record, ...patch };
  }
  return parchearLista(current, id, patch);
}

function parchearProduccion(
  current: unknown,
  id: string,
  patch: Partial<PedidoConTotales>,
): unknown {
  const record = asRecord(current);
  if (!record || !Array.isArray(record.pedidos)) return current;
  return { ...record, pedidos: parchearLista(record.pedidos, id, patch) };
}

export function useCambiarEstado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      estado: EstadoPedido;
      nota?: string | null;
    }): Promise<PedidoConTotales> => {
      silenciarRealtime(input.id);
      const { data, error } = await requireSupabase().rpc("cambiar_estado_pedido", {
        p_pedido_id: input.id,
        p_estado_nuevo: input.estado,
        p_nota: input.nota ?? null,
      });
      if (error) throw new Error(mensajeErrorSupabase(error));
      const row = asRecord(data);
      if (!row) throw new Error("No se recibió el pedido actualizado.");
      return mapPedidoConTotales(row);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["pedidos"] });
      await queryClient.cancelQueries({ queryKey: ["produccion"] });
      await queryClient.cancelQueries({ queryKey: ["entregas"] });
      patchEstadoEnCache(queryClient, input.id, input.estado);
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      await queryClient.invalidateQueries({ queryKey: ["produccion"] });
      await queryClient.invalidateQueries({ queryKey: ["entregas"] });
    },
    onSettled: async (_data, _error, input) => {
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      await queryClient.invalidateQueries({ queryKey: ["pedidos", input.id] });
      await queryClient.invalidateQueries({ queryKey: ["produccion"] });
      await queryClient.invalidateQueries({ queryKey: ["entregas"] });
    },
  });
}

export function useRegistrarPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      monto: number;
      metodo: MetodoPago;
    }): Promise<PedidoConTotales> => {
      silenciarRealtime(input.id);
      const { data, error } = await requireSupabase().rpc("registrar_pago_saldo", {
        p_pedido_id: input.id,
        p_monto: input.monto,
        p_metodo: input.metodo,
      });
      if (error) throw new Error(mensajeErrorSupabase(error));
      const row = asRecord(data);
      if (!row) throw new Error("No se recibió el cobro registrado.");
      return mapPedidoConTotales(row);
    },
    onSuccess: async (pedido) => {
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      await queryClient.invalidateQueries({ queryKey: ["pedidos", pedido.id] });
      await queryClient.invalidateQueries({ queryKey: ["entregas"] });
    },
  });
}
