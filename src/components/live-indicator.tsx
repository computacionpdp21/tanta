import { cn } from "@/lib/utils";
import type { EstadoRealtime } from "@/hooks/use-realtime-pedidos";

export function LiveIndicator({ estado }: { estado: EstadoRealtime }) {
  const enVivo = estado === "en_vivo";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        enVivo
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200"
          : "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
      )}
      title={enVivo ? "Conectado en tiempo real" : "Reconectando al servidor"}
    >
      <span
        className={cn("size-1.5 rounded-full", enVivo ? "bg-emerald-600" : "bg-amber-500 animate-pulse")}
        aria-hidden="true"
      />
      {enVivo ? "En vivo" : "Reconectando…"}
    </span>
  );
}
