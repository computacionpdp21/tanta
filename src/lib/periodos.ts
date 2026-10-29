import { endOfMonth, startOfMonth, startOfWeek } from "date-fns";
import { fechaConOffset, nowInLaPaz, toDateInputValue } from "@/lib/dates";

export type TipoPeriodo = "hoy" | "manana" | "semana" | "mes" | "temporada" | "rango";

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export function rangoDePeriodo(
  tipo: TipoPeriodo,
  extra: { temporadaDesde?: string; rangoDesde?: string; rangoHasta?: string } = {},
): RangoFechas {
  const hoy = toDateInputValue();
  const ahora = nowInLaPaz();

  switch (tipo) {
    case "hoy":
      return { desde: hoy, hasta: hoy };
    case "manana": {
      const manana = fechaConOffset(1);
      return { desde: manana, hasta: manana };
    }
    case "semana":
      return {
        desde: toDateInputValue(startOfWeek(ahora, { weekStartsOn: 1 })),
        hasta: hoy,
      };
    case "mes":
      return {
        desde: toDateInputValue(startOfMonth(ahora)),
        hasta: toDateInputValue(endOfMonth(ahora)),
      };
    case "temporada":
      return {
        desde: extra.temporadaDesde && extra.temporadaDesde <= hoy ? extra.temporadaDesde : hoy,
        hasta: hoy,
      };
    case "rango": {
      const desde = extra.rangoDesde || hoy;
      const hasta = extra.rangoHasta || hoy;
      return desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
    }
  }
}
