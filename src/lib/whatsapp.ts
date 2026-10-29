import { TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { formatFecha, formatHora } from "@/lib/dates";
import { formatBs } from "@/lib/formatters";
import type { PedidoCompleto, PedidoConTotales, PedidoItem } from "@/types/database";

type WhatsAppPedido = Pick<
  PedidoCompleto,
  | "numero_formateado"
  | "cliente_nombre"
  | "tipo_entrega"
  | "fecha_entrega"
  | "hora_entrega"
  | "adelanto"
  | "total"
  | "saldo"
  | "items"
>;

function lineaItem(item: PedidoItem): string {
  const unitario = formatBs(item.precio_unitario);
  const subtotal = formatBs(item.cantidad * item.precio_unitario);
  const nota = item.notas_item ? ` (${item.notas_item})` : "";
  return `• ${item.cantidad} x ${item.descripcion}${nota} – ${unitario} c/u = ${subtotal}`;
}

export function generarTextoWhatsApp(pedido: WhatsAppPedido): string {
  const fecha = formatFecha(pedido.fecha_entrega, "EEEE d/MM");
  const hora = pedido.hora_entrega ? ` a las ${formatHora(pedido.hora_entrega)}` : "";
  const tipo = TIPO_ENTREGA_LABELS[pedido.tipo_entrega];

  return [
    `🥖 *Panadería Janeth* – Pedido ${pedido.numero_formateado}`,
    `Cliente: ${pedido.cliente_nombre}`,
    `Entrega: ${fecha}${hora} (${tipo})`,
    "",
    ...pedido.items.map(lineaItem),
    "",
    `Total: ${formatBs(pedido.total)}`,
    `Adelanto: ${formatBs(pedido.adelanto)}`,
    `Saldo a cobrar: ${formatBs(pedido.saldo)}`,
    "¡Gracias por tu pedido! 🙏",
  ].join("\n");
}

export function pedidoParaWhatsApp(
  pedido: PedidoConTotales,
  items: PedidoItem[],
): WhatsAppPedido {
  return { ...pedido, items };
}
