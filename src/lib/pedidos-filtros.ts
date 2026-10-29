import type { EstadoPedido, TipoEntrega } from "@/types/database";
import { ESTADOS_PEDIDO } from "@/types/database";

export interface PedidosFiltros {
  q: string;
  desde: string;
  hasta: string;
  estados: EstadoPedido[];
  tipo: TipoEntrega | "";
  cancelados: boolean;
}

export const FILTROS_VACIOS: PedidosFiltros = {
  q: "",
  desde: "",
  hasta: "",
  estados: [],
  tipo: "",
  cancelados: false,
};

function isEstado(value: string): value is EstadoPedido {
  return ESTADOS_PEDIDO.includes(value as EstadoPedido);
}

export function parseFiltros(params: URLSearchParams): PedidosFiltros {
  const tipo = params.get("tipo");
  const estados = (params.get("estados") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(isEstado);

  return {
    q: params.get("q") ?? "",
    desde: params.get("desde") ?? "",
    hasta: params.get("hasta") ?? "",
    estados,
    tipo: tipo === "recojo" || tipo === "envio" ? tipo : "",
    cancelados: params.get("cancelados") === "1",
  };
}

export function serializarFiltros(filtros: PedidosFiltros): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.q.trim()) params.set("q", filtros.q.trim());
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.estados.length > 0) params.set("estados", filtros.estados.join(","));
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.cancelados) params.set("cancelados", "1");
  return params;
}

export function sanitizarBusqueda(q: string): string {
  return q.replace(/[%(),.*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function mismosFiltros(a: PedidosFiltros, b: PedidosFiltros): boolean {
  return (
    a.q === b.q &&
    a.desde === b.desde &&
    a.hasta === b.hasta &&
    a.tipo === b.tipo &&
    a.cancelados === b.cancelados &&
    a.estados.join(",") === b.estados.join(",")
  );
}
