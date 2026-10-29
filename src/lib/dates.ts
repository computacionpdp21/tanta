import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TIMEZONE } from "@/lib/constants";

export function nowInLaPaz(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
}

export function toDateInputValue(date: Date = nowInLaPaz()): string {
  return format(date, "yyyy-MM-dd");
}

export function fechaConOffset(dias: number): string {
  return toDateInputValue(addDays(nowInLaPaz(), dias));
}

export function esFechaPasada(value: string): boolean {
  return value < toDateInputValue();
}

export function parseFechaLocal(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return parseISO(value);
}

export function formatFecha(value: Date | string, pattern = "EEE d MMM"): string {
  const date = typeof value === "string" ? parseFechaLocal(value) : value;
  return format(date, pattern, { locale: es });
}

export function formatFechaLarga(value: Date | string): string {
  return formatFecha(value, "EEEE d 'de' MMMM");
}

export function formatHora(value: string | null): string {
  if (!value) return "Sin hora";
  const [hours, minutes] = value.split(":");
  return `${hours}:${minutes}`;
}

export function formatFechaHora(value: string): string {
  return format(parseISO(value), "d MMM, HH:mm", { locale: es });
}

export function formatFechaInstante(value: string, pattern = "d MMM yyyy"): string {
  return format(parseISO(value), pattern, { locale: es });
}

export function formatImpresoEn(): string {
  return format(nowInLaPaz(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
}

export function esAtrasado(fechaEntrega: string, estado: string): boolean {
  return fechaEntrega < toDateInputValue() && estado !== "entregado" && estado !== "cancelado";
}
