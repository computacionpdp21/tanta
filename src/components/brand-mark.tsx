import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "size-10",
  md: "size-[52px]",
  lg: "size-28",
} as const;

export function BrandMark({
  className,
  showWordmark = true,
  compact = false,
  size,
}: BrandMarkProps) {
  const resolved = size ?? (compact ? "sm" : "md");

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/logo.png"
        alt=""
        width={resolved === "lg" ? 112 : resolved === "sm" ? 40 : 52}
        height={resolved === "lg" ? 112 : resolved === "sm" ? 40 : 52}
        className={cn(
          "shrink-0 rounded-full bg-[#f3e6cf] object-cover shadow-sm ring-2 ring-white/70",
          SIZES[resolved],
        )}
      />
      {showWordmark ? (
        <span className="min-w-0">
          <span
            className={cn(
              "font-display block truncate leading-tight font-semibold tracking-tight",
              resolved === "lg" ? "text-2xl" : "text-lg",
            )}
          >
            Panadería Janeth
          </span>
          <span className="block text-xs font-medium tracking-[0.18em] uppercase opacity-70">
            Pedidos
          </span>
        </span>
      ) : null}
    </div>
  );
}
