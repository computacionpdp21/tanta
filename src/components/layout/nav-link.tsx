import { NavLink as RouterNavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppNavLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  variant?: "sidebar" | "bottom";
  onNavigate?: () => void;
  end?: boolean;
}

export function AppNavLink({
  to,
  label,
  icon: Icon,
  variant = "sidebar",
  onNavigate,
  end,
}: AppNavLinkProps) {
  const exact = end ?? (to === "/pedidos" || to === "/");

  if (variant === "bottom") {
    return (
      <RouterNavLink
        to={to}
        end={exact}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition-colors duration-200",
            isActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors duration-200",
                isActive && "bg-accent/20 text-accent-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" strokeWidth={isActive ? 2.4 : 2} />
            </span>
            <span className="truncate">{label}</span>
          </>
        )}
      </RouterNavLink>
    );
  }

  return (
    <RouterNavLink
      to={to}
      end={exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
          isActive
            ? "bg-accent/18 text-accent before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {label}
    </RouterNavLink>
  );
}
