import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { EstadoBadge } from "@/components/estado-badge";
import { ItemChips } from "@/components/item-chips";
import { Button } from "@/components/ui/button";
import { TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { esAtrasado, formatFecha, formatHora } from "@/lib/dates";
import { formatBs, waMeUrl } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { generarTextoWhatsApp, prepararWhatsApp } from "@/lib/whatsapp";
import type { PedidoConTotales } from "@/types/database";

interface PedidoCardProps {
  pedido: PedidoConTotales;
  className?: string;
  highlight?: boolean;
}

export function PedidoCard({ pedido, className, highlight }: PedidoCardProps) {
  const atrasado = esAtrasado(pedido.fecha_entrega, pedido.estado);
  const textoWhatsApp = generarTextoWhatsApp(pedido);
  const hrefWhatsApp = waMeUrl(pedido.cliente_telefono, textoWhatsApp);

  return (
    <article
      className={cn(
        "lift-card fade-up bg-card rounded-2xl border p-4 shadow-sm",
        atrasado ? "border-destructive ring-1 ring-destructive/30" : "border-border/80",
        highlight && "row-flash",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <a href={`/pedidos/${pedido.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold">{pedido.numero_formateado}</p>
            <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
            {atrasado ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-400/20 dark:text-red-200">
                Atrasado
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate font-medium">{pedido.cliente_nombre}</p>
          <p className="text-muted-foreground text-sm">
            {formatFecha(pedido.fecha_entrega, "EEE d MMM")} · {formatHora(pedido.hora_entrega)}
          </p>
          <p className="text-muted-foreground text-xs">{TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}</p>
          {pedido.items_resumen ? (
            <ItemChips resumen={pedido.items_resumen} className="mt-2" />
          ) : null}
        </a>
        <Button
          asChild
          variant="whatsapp"
          size="icon"
          className="shrink-0"
          aria-label="WhatsApp"
        >
          <a
            href={hrefWhatsApp}
            target="_blank"
            rel="noreferrer"
            onClick={() => prepararWhatsApp(textoWhatsApp)}
          >
            <MessageCircle className="size-5" />
          </a>
        </Button>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Total</p>
          <p className="font-semibold whitespace-nowrap tabular-nums">{formatBs(pedido.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Saldo</p>
          <p
            className={cn(
              "font-semibold whitespace-nowrap tabular-nums",
              pedido.saldo > 0 ? "text-orange-700 dark:text-orange-300" : "text-success",
            )}
          >
            {formatBs(pedido.saldo)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PedidoRow({
  pedido,
  highlight,
}: {
  pedido: PedidoConTotales;
  highlight?: boolean;
}) {
  const navigate = useNavigate();
  const atrasado = esAtrasado(pedido.fecha_entrega, pedido.estado);
  const textoWhatsApp = generarTextoWhatsApp(pedido);
  const hrefWhatsApp = waMeUrl(pedido.cliente_telefono, textoWhatsApp);

  return (
    <tr
      className={cn(
        "hover:bg-secondary/50 h-16 cursor-pointer border-b last:border-0 transition-colors",
        atrasado && "bg-red-50/70 dark:bg-red-950/20",
        highlight && "row-flash",
      )}
      onClick={() => navigate(`/pedidos/${pedido.id}`)}
    >
      <td className={cn("px-3 py-2", atrasado && "border-l-[3px] border-l-destructive")}>
        <span className="block font-semibold">{pedido.numero_formateado}</span>
        <span className="block font-medium">{pedido.cliente_nombre}</span>
        {atrasado ? (
          <span className="text-[11px] font-semibold text-red-700">Atrasado</span>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <span className="block whitespace-nowrap">
          {formatFecha(pedido.fecha_entrega, "d MMM")} {formatHora(pedido.hora_entrega)}
        </span>
        <span className="text-muted-foreground block text-xs">
          {TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}
        </span>
      </td>
      <td className="max-w-xs px-3 py-2">
        <ItemChips resumen={pedido.items_resumen} />
      </td>
      <td className="px-3 py-2 text-right font-medium whitespace-nowrap tabular-nums">
        {formatBs(pedido.total)}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums",
          pedido.saldo > 0 && "text-orange-700 dark:text-orange-300",
        )}
      >
        {formatBs(pedido.saldo)}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
      </td>
      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
        <Button asChild variant="whatsapp" size="icon-sm" className="xl:h-9 xl:w-auto xl:px-3">
          <a
            href={hrefWhatsApp}
            target="_blank"
            rel="noreferrer"
            title="Enviar por WhatsApp"
            aria-label="WhatsApp"
            onClick={() => prepararWhatsApp(textoWhatsApp)}
          >
            <MessageCircle className="size-4" />
            <span className="hidden xl:inline">WhatsApp</span>
          </a>
        </Button>
      </td>
    </tr>
  );
}
