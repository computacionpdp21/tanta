import type { EstadoPedido, RolUsuario } from "@/types/database";

export const FLUJO_ESTADOS: EstadoPedido[] = [
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
];

export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  if (estado === "pendiente") return "en_produccion";
  if (estado === "en_produccion") return "listo";
  if (estado === "listo") return "entregado";
  return null;
}

export function estadoPrevio(estado: EstadoPedido): EstadoPedido | null {
  if (estado === "en_produccion") return "pendiente";
  if (estado === "listo") return "en_produccion";
  if (estado === "entregado") return "listo";
  if (estado === "cancelado") return "pendiente";
  return null;
}

export function etiquetaAvance(estado: EstadoPedido): string | null {
  if (estado === "pendiente") return "Empezar producción";
  if (estado === "en_produccion") return "Marcar listo";
  if (estado === "listo") return "Marcar entregado";
  return null;
}

export function puedeCambiarEstado(
  rol: RolUsuario | null | undefined,
  actual: EstadoPedido,
  nuevo: EstadoPedido,
): boolean {
  if (!rol) return false;
  if (actual === nuevo) return false;

  if (nuevo === "cancelado") {
    return actual !== "entregado" && (rol === "admin" || rol === "vendedor" || rol === "operativo");
  }

  if (rol === "admin") {
    if (actual === "cancelado") return nuevo === "pendiente";
    const prev = estadoPrevio(actual);
    const next = siguienteEstado(actual);
    return nuevo === prev || nuevo === next;
  }

  if (rol === "vendedor" || rol === "operativo") {
    return siguienteEstado(actual) === nuevo;
  }

  if (rol === "produccion") {
    return (
      (actual === "pendiente" && nuevo === "en_produccion") ||
      (actual === "en_produccion" && nuevo === "listo")
    );
  }

  if (rol === "entregas") {
    return actual === "listo" && nuevo === "entregado";
  }

  return false;
}

export function puedeEditarPedido(
  rol: RolUsuario | null | undefined,
  estado: EstadoPedido,
): boolean {
  if (!rol) return false;
  if (rol === "admin") return true;
  if (rol !== "vendedor" && rol !== "operativo") return false;
  return estado !== "entregado" && estado !== "cancelado";
}
