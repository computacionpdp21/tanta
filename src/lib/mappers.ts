import type {
  EstadoPedido,
  MetodoPago,
  Pago,
  PedidoCompleto,
  PedidoConTotales,
  PedidoHistorial,
  PedidoItem,
  PedidoItemConProducto,
  Perfil,
  Producto,
  RolUsuario,
  TipoEntrega,
  TipoPago,
} from "@/types/database";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const ROLES: RolUsuario[] = ["admin", "vendedor", "operativo", "produccion", "entregas"];
const TIPOS: TipoEntrega[] = ["recojo", "envio"];
const ESTADOS: EstadoPedido[] = [
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
];
const METODOS: MetodoPago[] = ["efectivo", "qr", "transferencia"];
const TIPOS_PAGO: TipoPago[] = ["adelanto", "saldo"];

function asRol(value: unknown): RolUsuario {
  return ROLES.includes(value as RolUsuario) ? (value as RolUsuario) : "vendedor";
}

function asTipo(value: unknown): TipoEntrega {
  return TIPOS.includes(value as TipoEntrega) ? (value as TipoEntrega) : "recojo";
}

function asEstado(value: unknown): EstadoPedido {
  return ESTADOS.includes(value as EstadoPedido) ? (value as EstadoPedido) : "pendiente";
}

function asMetodo(value: unknown): MetodoPago | null {
  return METODOS.includes(value as MetodoPago) ? (value as MetodoPago) : null;
}

function asMetodoRequired(value: unknown): MetodoPago {
  return asMetodo(value) ?? "efectivo";
}

function asTipoPago(value: unknown): TipoPago {
  return TIPOS_PAGO.includes(value as TipoPago) ? (value as TipoPago) : "saldo";
}

export function mapPerfil(row: Record<string, unknown>): Perfil {
  return {
    id: asString(row.id),
    nombre: asString(row.nombre),
    rol: asRol(row.rol),
    activo: asBoolean(row.activo, true),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function mapProducto(row: Record<string, unknown>): Producto {
  return {
    id: asString(row.id),
    nombre: asString(row.nombre),
    tamano: asString(row.tamano),
    precio_base: asNumber(row.precio_base),
    activo: asBoolean(row.activo, true),
    orden: asNumber(row.orden),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function mapPedidoConTotales(row: Record<string, unknown>): PedidoConTotales {
  return {
    id: asString(row.id),
    numero: asNumber(row.numero),
    numero_formateado: asString(row.numero_formateado),
    cliente_nombre: asString(row.cliente_nombre),
    cliente_telefono: asString(row.cliente_telefono),
    tipo_entrega: asTipo(row.tipo_entrega),
    direccion: asStringOrNull(row.direccion),
    referencia_ubicacion: asStringOrNull(row.referencia_ubicacion),
    fecha_entrega: asString(row.fecha_entrega),
    hora_entrega: asStringOrNull(row.hora_entrega),
    estado: asEstado(row.estado),
    adelanto: asNumber(row.adelanto),
    metodo_pago_adelanto: asMetodo(row.metodo_pago_adelanto),
    costo_envio: asNumber(row.costo_envio),
    notas: asStringOrNull(row.notas),
    metodo_pago_saldo: asMetodo(row.metodo_pago_saldo),
    cobrado_en: asStringOrNull(row.cobrado_en),
    creado_por: asStringOrNull(row.creado_por),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    subtotal_items: asNumber(row.subtotal_items),
    total: asNumber(row.total),
    pagos_saldo: asNumber(row.pagos_saldo),
    saldo: asNumber(row.saldo),
    items_resumen: asString(row.items_resumen),
  };
}

export function mapPedidoItem(row: Record<string, unknown>): PedidoItem {
  return {
    id: asString(row.id),
    pedido_id: asString(row.pedido_id),
    producto_id: asStringOrNull(row.producto_id),
    descripcion: asString(row.descripcion),
    cantidad: asNumber(row.cantidad, 1),
    precio_unitario: asNumber(row.precio_unitario),
    notas_item: asStringOrNull(row.notas_item),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function mapPedidoItemConProducto(row: Record<string, unknown>): PedidoItemConProducto {
  const producto = asRecord(row.producto) ?? asRecord(row.productos);
  return {
    ...mapPedidoItem(row),
    producto_nombre: producto ? asStringOrNull(producto.nombre) : null,
    producto_tamano: producto ? asStringOrNull(producto.tamano) : null,
  };
}

export function mapPedidoHistorial(
  row: Record<string, unknown>,
  nombres: Record<string, string> = {},
): PedidoHistorial {
  const cambiadoPor = asStringOrNull(row.cambiado_por);
  return {
    id: asString(row.id),
    pedido_id: asString(row.pedido_id),
    estado_anterior: row.estado_anterior ? asEstado(row.estado_anterior) : null,
    estado_nuevo: asEstado(row.estado_nuevo),
    cambiado_por: cambiadoPor,
    nota: asStringOrNull(row.nota),
    created_at: asString(row.created_at),
    usuario_nombre: cambiadoPor ? (nombres[cambiadoPor] ?? null) : null,
  };
}

export function mapPago(row: Record<string, unknown>, nombres: Record<string, string> = {}): Pago {
  const usuarioId = asStringOrNull(row.usuario_id);
  return {
    id: asString(row.id),
    pedido_id: asString(row.pedido_id),
    monto: asNumber(row.monto),
    metodo: asMetodoRequired(row.metodo),
    tipo: asTipoPago(row.tipo),
    usuario_id: usuarioId,
    created_at: asString(row.created_at),
    usuario_nombre: usuarioId ? (nombres[usuarioId] ?? null) : null,
  };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

export async function mapNombresUsuarios(
  ids: Array<string | null | undefined>,
  fetchNombres: (ids: string[]) => Promise<Record<string, string>>,
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return {};
  return fetchNombres(unique);
}

export function mapPedidoCompleto(
  pedido: Record<string, unknown>,
  items: Record<string, unknown>[],
  historial: Record<string, unknown>[],
  pagos: Record<string, unknown>[] = [],
  nombres: Record<string, string> = {},
): PedidoCompleto {
  return {
    ...mapPedidoConTotales(pedido),
    items: items.map(mapPedidoItem),
    historial: historial.map((row) => mapPedidoHistorial(row, nombres)),
    pagos: pagos.map((row) => mapPago(row, nombres)),
  };
}
