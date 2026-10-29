import { BrandMark } from "@/components/brand-mark";
import { LiveIndicator } from "@/components/live-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import type { EstadoRealtime } from "@/hooks/use-realtime-pedidos";

interface HeaderProps {
  title: string;
  description?: string;
  realtime: EstadoRealtime;
}

export function Header({ title, description, realtime }: HeaderProps) {
  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md no-print">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <BrandMark compact />
        <div className="flex items-center gap-2">
          <LiveIndicator estado={realtime} />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 lg:px-8 lg:py-5">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight lg:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        <div className="hidden lg:block">
          <LiveIndicator estado={realtime} />
        </div>
      </div>
    </header>
  );
}
