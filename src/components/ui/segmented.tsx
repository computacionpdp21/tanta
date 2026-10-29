import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="bg-surface-2 relative flex flex-wrap gap-1 rounded-full p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 min-h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-200",
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className={cn("ml-1.5 text-[11px] tabular-nums", active ? "opacity-80" : "")}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
