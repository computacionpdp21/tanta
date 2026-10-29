import { useQuery } from "@tanstack/react-query";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import { asRecord, asRecordArray } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";
import type { EstadoPedido, TipoEntrega } from "@/types/database";

export interface ReporteKpis {
  pedidos: number;
  unidades: number;
  ventas: number;
  adelantos: number;
  cobros: number;
  saldo: number;
  ticket: number;
  cancelados: number;
}

export interface ReporteDia {
  fecha: string;
  pedidos: number;
  unidades: number;
  ventas: number;
}

export interface ReporteTipo {
  tipo: TipoEntrega;
  cantidad: number;
  ventas: number;
}

export interface ReporteEstado {
  estado: EstadoPedido;
  cantidad: number;
}

export interface ReporteProducto {
  nombre: string;
  tamano: string;
  unidades: number;
  ventas: number;
}

export interface ReportePorCobrar {
  id: string;
  numero: number;
  numero_formateado: string;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string;
  hora_entrega: string | null;
  estado: EstadoPedido;
  total: number;
  saldo: number;
}

export interface ReportePeriodo {
  kpis: ReporteKpis;
  por_dia: ReporteDia[];
  por_tipo: ReporteTipo[];
  por_estado: ReporteEstado[];
  productos: ReporteProducto[];
  por_cobrar: ReportePorCobrar[];
}

function asNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asStr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapKpis(row: Record<string, unknown> | null): ReporteKpis {
  return {
    pedidos: asNum(row?.pedidos),
    unidades: asNum(row?.unidades),
    ventas: asNum(row?.ventas),
    adelantos: asNum(row?.adelantos),
    cobros: asNum(row?.cobros),
    saldo: asNum(row?.saldo),
    ticket: asNum(row?.ticket),
    cancelados: asNum(row?.cancelados),
  };
}

function mapReporte(raw: unknown): ReportePeriodo {
  const row = asRecord(raw) ?? {};
  return {
    kpis: mapKpis(asRecord(row.kpis)),
    por_dia: asRecordArray(row.por_dia).map((item) => ({
      fecha: asStr(item.fecha),
      pedidos: asNum(item.pedidos),
      unidades: asNum(item.unidades),
      ventas: asNum(item.ventas),
    })),
    por_tipo: asRecordArray(row.por_tipo).map((item) => ({
      tipo: item.tipo === "envio" ? "envio" : "recojo",
      cantidad: asNum(item.cantidad),
      ventas: asNum(item.ventas),
    })),
    por_estado: asRecordArray(row.por_estado).map((item) => ({
      estado: asStr(item.estado) as EstadoPedido,
      cantidad: asNum(item.cantidad),
    })),
    productos: asRecordArray(row.productos).map((item) => ({
      nombre: asStr(item.nombre),
      tamano: asStr(item.tamano),
      unidades: asNum(item.unidades),
      ventas: asNum(item.ventas),
    })),
    por_cobrar: asRecordArray(row.por_cobrar).map((item) => ({
      id: asStr(item.id),
      numero: asNum(item.numero),
      numero_formateado: asStr(item.numero_formateado),
      cliente_nombre: asStr(item.cliente_nombre),
      cliente_telefono: asStr(item.cliente_telefono),
      fecha_entrega: asStr(item.fecha_entrega),
      hora_entrega: asStr(item.hora_entrega) || null,
      estado: asStr(item.estado) as EstadoPedido,
      total: asNum(item.total),
      saldo: asNum(item.saldo),
    })),
  };
}

export function useReporte(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["reporte", desde, hasta],
    enabled: Boolean(desde && hasta),
    queryFn: async (): Promise<ReportePeriodo> => {
      const { data, error } = await requireSupabase().rpc("admin_reporte", {
        p_desde: desde,
        p_hasta: hasta,
      });
      if (error) throw new Error(mensajeErrorSupabase(error));
      return mapReporte(data);
    },
  });
}

export async function exportarReporte(
  tipo: "pedidos" | "items" | "pagos",
  desde: string,
  hasta: string,
): Promise<Record<string, unknown>[]> {
  const fn =
    tipo === "pedidos"
      ? "admin_exportar_pedidos"
      : tipo === "items"
        ? "admin_exportar_items"
        : "admin_exportar_pagos";
  const { data, error } = await requireSupabase().rpc(fn, {
    p_desde: desde,
    p_hasta: hasta,
  });
  if (error) throw new Error(mensajeErrorSupabase(error));
  return asRecordArray(data);
}
