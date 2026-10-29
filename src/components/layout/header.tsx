import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LiveIndicator } from "@/components/live-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import type { EstadoRealtime } from "@/hooks/use-realtime-pedidos";
import { puede, ROLES_GESTIONAR_PEDIDOS } from "@/lib/permisos";

interface HeaderProps {
  title: string;
  description?: string;
  realtime: EstadoRealtime;
}

export function Header({ title, description, realtime }: HeaderProps) {
  const { pathname } = useLocation();
  const { rol } = useAuth();
  const mostrarNuevo =
    pathname === "/pedidos" && puede(rol, ROLES_GESTIONAR_PEDIDOS);

  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md no-print">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Link to="/" aria-label="Ir al inicio">
          <BrandMark compact />
        </Link>
        <div className="flex items-center gap-2">
          <LiveIndicator estado={realtime} />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight lg:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mostrarNuevo ? (
            <Button asChild size="sm" className="lg:size-auto lg:h-11 lg:px-4">
              <Link to="/pedidos/nuevo">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nuevo pedido</span>
              </Link>
            </Button>
          ) : null}
          <div className="hidden lg:block">
            <LiveIndicator estado={realtime} />
          </div>
        </div>
      </div>
    </header>
  );
}
