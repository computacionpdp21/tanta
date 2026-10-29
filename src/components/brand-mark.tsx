import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
}

export function BrandMark({
  className,
  showWordmark = true,
  compact = false,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl bg-primary shadow-sm",
          compact ? "size-9" : "size-11",
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          className={compact ? "size-6" : "size-7"}
          fill="none"
        >
          <path
            d="M18 40c0-10 6.5-18 14-18s14 8 14 18"
            stroke="currentColor"
            className="text-primary-foreground"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M22 40c1.5-7 5-12.5 10-12.5S40.5 33 42 40"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="32" cy="22" r="3.2" className="fill-accent" />
          <path
            d="M16 44h32"
            stroke="currentColor"
            className="text-primary-foreground"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span className="font-display block truncate text-lg leading-tight font-semibold tracking-tight">
            Panadería Janeth
          </span>
          <span className="text-muted-foreground block text-xs font-medium tracking-wide uppercase">
            Pedidos
          </span>
        </span>
      ) : null}
    </div>
  );
}
