import { cn } from "@/lib/utils";

function parseItemsResumen(resumen: string): string[] {
  return resumen
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ItemChips({
  resumen,
  max = 2,
  className,
}: {
  resumen: string;
  max?: number;
  className?: string;
}) {
  const items = parseItemsResumen(resumen);
  if (items.length === 0) return null;
  const visibles = items.slice(0, max);
  const extra = items.length - visibles.length;

  return (
    <div className={cn("flex max-w-full flex-wrap items-center gap-1", className)} title={resumen}>
      {visibles.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="bg-secondary text-secondary-foreground max-w-[11rem] truncate rounded-full px-2 py-0.5 text-[11px] font-medium"
        >
          {item}
        </span>
      ))}
      {extra > 0 ? (
        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-semibold">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
