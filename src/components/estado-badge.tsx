import { ESTADO_LABELS, ESTADO_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EstadoPedido } from "@/types/database";

interface EstadoBadgeProps {
  estado: EstadoPedido;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const style = ESTADO_STYLES[estado];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        style.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dotClassName)} aria-hidden="true" />
      {ESTADO_LABELS[estado]}
    </span>
  );
}
