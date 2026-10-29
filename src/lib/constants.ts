import {
  BarChart3,
  ClipboardList,
  ChefHat,
  PlusCircle,
  Truck,
  UserRound,
  Users,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import {
  ROLES_CATALOGO,
  ROLES_ENTREGAS,
  ROLES_GESTIONAR_PEDIDOS,
  ROLES_PRODUCCION,
  ROLES_RESUMEN,
  ROLES_USUARIOS,
  ROLES_VER_PEDIDOS,
} from "@/lib/permisos";
import type { EstadoPedido, MetodoPago, RolUsuario } from "@/types/database";

export const APP_NAME = "Panadería Janeth";
export const APP_TAGLINE = "Pedidos";
export const TIMEZONE = "America/La_Paz";
export const PHONE_COUNTRY_CODE = "591";

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin: "Administración",
  vendedor: "Ventas",
  operativo: "Operativo",
  produccion: "Producción",
  entregas: "Entregas",
};

export const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  en_produccion: "En producción",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ESTADO_STYLES: Record<
  EstadoPedido,
  { className: string; dotClassName: string }
> = {
  pendiente: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-400/20 dark:text-blue-200",
    dotClassName: "bg-[#3B82F6]",
  },
  en_produccion: {
    className: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
    dotClassName: "bg-[#D9983A]",
  },
  listo: {
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
    dotClassName: "bg-[#2E9E5B]",
  },
  entregado: {
    className: "bg-stone-200 text-stone-700 dark:bg-stone-500/30 dark:text-stone-200",
    dotClassName: "bg-[#8B7B6B]",
  },
  cancelado: {
    className: "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200",
    dotClassName: "bg-[#C0392B]",
  },
};

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
};

export const TIPO_ENTREGA_LABELS = {
  recojo: "Recojo en tienda",
  envio: "Envío",
} as const;

export const ROL_DESCRIPCIONES: Record<RolUsuario, string> = {
  admin: "Ve todo: catálogo, reportes, usuarios y puede cambiar cualquier pedido.",
  vendedor: "Crea y edita pedidos, cobra y cambia estados. No toca el catálogo ni usuarios.",
  operativo: "Crea, edita, cancela, cobra y cambia estados. Sin catálogo, usuarios ni reportes.",
  produccion: "Ve la cocina y pasa pedidos a En producción o Listo. No cobra ni cancela.",
  entregas: "Ve la ruta del día, marca entregado y registra el cobro del saldo.",
};

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: RolUsuario[];
}

export const PRIMARY_NAV: NavItem[] = [
  {
    to: "/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    roles: [...ROLES_VER_PEDIDOS],
  },
  {
    to: "/pedidos/nuevo",
    label: "Nuevo",
    icon: PlusCircle,
    roles: [...ROLES_GESTIONAR_PEDIDOS],
  },
  {
    to: "/produccion",
    label: "Producción",
    icon: ChefHat,
    roles: [...ROLES_PRODUCCION],
  },
  {
    to: "/entregas",
    label: "Entregas",
    icon: Truck,
    roles: [...ROLES_ENTREGAS],
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    to: "/productos",
    label: "Catálogo",
    icon: Wheat,
    roles: [...ROLES_CATALOGO],
  },
  {
    to: "/resumen",
    label: "Resumen",
    icon: BarChart3,
    roles: [...ROLES_RESUMEN],
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: [...ROLES_USUARIOS],
  },
];

export const ACCOUNT_NAV: NavItem = {
  to: "/cuenta",
  label: "Mi cuenta",
  icon: UserRound,
  roles: [...ROLES_VER_PEDIDOS],
};
