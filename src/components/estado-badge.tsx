import { ESTADO_LABELS, ESTADO_STYLES } from "@/lib/constants";
import { formatBs } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { EstadoPedido } from "@/types/database";

interface EstadoBadgeProps {
  estado: EstadoPedido;
  className?: string;
  saldo?: number;
}

export function EstadoBadge({ estado, className, saldo = 0 }: EstadoBadgeProps) {
  const style = ESTADO_STYLES[estado];
  const debe = estado === "entregado" && saldo > 0;

  if (debe) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-900 dark:bg-orange-400/20 dark:text-orange-200",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-[#C0392B]" aria-hidden="true" />
        Entregado · debe {formatBs(saldo)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        style.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dotClassName)} aria-hidden="true" />
      {ESTADO_LABELS[estado]}
    </span>
  );
}
