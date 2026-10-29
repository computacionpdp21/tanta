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
}

export function PedidoCard({ pedido, className }: PedidoCardProps) {
  const atrasado = esAtrasado(pedido.fecha_entrega, pedido.estado);
  const textoWhatsApp = generarTextoWhatsApp(pedido);
  const hrefWhatsApp = waMeUrl(pedido.cliente_telefono, textoWhatsApp);

  return (
    <article
      className={cn(
        "lift-card fade-up bg-card rounded-2xl border p-4 shadow-sm",
        atrasado ? "border-destructive ring-1 ring-destructive/30" : "border-border/80",
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
            {formatFecha(pedido.fecha_entrega, "EEE d MMM")} · {formatHora(pedido.hora_entrega)} ·{" "}
            {TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}
          </p>
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
          <p className="font-semibold">{formatBs(pedido.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Saldo</p>
          <p className={cn("font-semibold", pedido.saldo > 0 ? "text-destructive" : "text-success")}>
            {formatBs(pedido.saldo)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PedidoRow({ pedido }: { pedido: PedidoConTotales }) {
  const navigate = useNavigate();
  const atrasado = esAtrasado(pedido.fecha_entrega, pedido.estado);
  const textoWhatsApp = generarTextoWhatsApp(pedido);
  const hrefWhatsApp = waMeUrl(pedido.cliente_telefono, textoWhatsApp);

  return (
    <tr
      className={cn(
        "hover:bg-secondary/50 cursor-pointer border-b last:border-0 transition-colors",
        atrasado && "bg-red-50/70 dark:bg-red-950/20",
      )}
      onClick={() => navigate(`/pedidos/${pedido.id}`)}
    >
      <td className="px-3 py-3">
        <span className="font-semibold">{pedido.numero_formateado}</span>
        {atrasado ? (
          <span className="ml-2 text-[11px] font-semibold text-red-700">Atrasado</span>
        ) : null}
      </td>
      <td className="px-3 py-3 font-medium">{pedido.cliente_nombre}</td>
      <td className="px-3 py-3 whitespace-nowrap">
        {formatFecha(pedido.fecha_entrega, "d MMM")} {formatHora(pedido.hora_entrega)}
      </td>
      <td className="px-3 py-3">{TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}</td>
      <td className="max-w-xs px-3 py-3">
        <ItemChips resumen={pedido.items_resumen} />
      </td>
      <td className="px-3 py-3 text-right font-medium">{formatBs(pedido.total)}</td>
      <td className={cn("px-3 py-3 text-right font-semibold", pedido.saldo > 0 && "text-destructive")}>
        {formatBs(pedido.saldo)}
      </td>
      <td className="px-3 py-3">
        <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
      </td>
      <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
        <Button asChild variant="whatsapp" size="sm">
          <a
            href={hrefWhatsApp}
            target="_blank"
            rel="noreferrer"
            onClick={() => prepararWhatsApp(textoWhatsApp)}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
      </td>
    </tr>
  );
}
