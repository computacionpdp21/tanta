export type RolUsuario = "admin" | "vendedor" | "operativo" | "produccion" | "entregas";

export type TipoEntrega = "recojo" | "envio";

export type EstadoPedido =
  | "pendiente"
  | "en_produccion"
  | "listo"
  | "entregado"
  | "cancelado";

export type MetodoPago = "efectivo" | "qr" | "transferencia";

export type TipoPago = "adelanto" | "saldo";

export interface Perfil {
  id: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  tamano: string;
  precio_base: number;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: string;
  numero: number;
  numero_formateado: string;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_entrega: TipoEntrega;
  direccion: string | null;
  referencia_ubicacion: string | null;
  fecha_entrega: string;
  hora_entrega: string | null;
  estado: EstadoPedido;
  adelanto: number;
  metodo_pago_adelanto: MetodoPago | null;
  costo_envio: number;
  notas: string | null;
  metodo_pago_saldo: MetodoPago | null;
  cobrado_en: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  notas_item: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoItemConProducto extends PedidoItem {
  producto_nombre: string | null;
  producto_tamano: string | null;
}

export interface PedidoHistorial {
  id: string;
  pedido_id: string;
  estado_anterior: EstadoPedido | null;
  estado_nuevo: EstadoPedido;
  cambiado_por: string | null;
  nota: string | null;
  created_at: string;
  usuario_nombre: string | null;
}

export interface Pago {
  id: string;
  pedido_id: string;
  monto: number;
  metodo: MetodoPago;
  tipo: TipoPago;
  usuario_id: string | null;
  created_at: string;
  usuario_nombre: string | null;
}

export interface PedidoConTotales extends Pedido {
  subtotal_items: number;
  total: number;
  pagos_saldo: number;
  saldo: number;
  items_resumen: string;
}

export interface PedidoCompleto extends PedidoConTotales {
  items: PedidoItem[];
  historial: PedidoHistorial[];
  pagos: Pago[];
}

export interface ResumenProduccion {
  producto_id: string | null;
  nombre: string;
  tamano: string;
  cantidad_total: number;
}

export const ROLES: RolUsuario[] = [
  "admin",
  "vendedor",
  "operativo",
  "produccion",
  "entregas",
];

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
];
