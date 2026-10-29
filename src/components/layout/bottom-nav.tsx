import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { AppNavLink } from "@/components/layout/nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-context";
import { ACCOUNT_NAV, PRIMARY_NAV, ROL_LABELS, SECONDARY_NAV } from "@/lib/constants";
import { puede } from "@/lib/permisos";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { perfil, rol } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = PRIMARY_NAV.filter((item) => puede(rol, item.roles));
  const secondary = SECONDARY_NAV.filter((item) => puede(rol, item.roles));

  return (
    <>
      <nav
        aria-label="Principal"
        className="border-border bg-card/95 supports-backdrop-filter:bg-card/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden no-print"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1">
          {primary.map((item) => (
            <AppNavLink key={item.to} {...item} variant="bottom" />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "text-muted-foreground hover:text-foreground flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium",
            )}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <span className="flex size-8 items-center justify-center rounded-lg">
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </span>
            Más
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
            <SheetDescription>
              {perfil?.nombre}
              {rol ? ` · ${ROL_LABELS[rol]}` : ""}
            </SheetDescription>
          </SheetHeader>
          {rol ? (
            <div className="px-4">
              <Badge variant="secondary">{ROL_LABELS[rol]}</Badge>
            </div>
          ) : null}
          <div className="grid gap-2 px-4">
            {secondary.map((item) => (
              <AppNavLink
                key={item.to}
                {...item}
                onNavigate={() => setMoreOpen(false)}
              />
            ))}
            <AppNavLink {...ACCOUNT_NAV} onNavigate={() => setMoreOpen(false)} />
            <div className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm font-medium">Apariencia</span>
              <ThemeToggle />
            </div>
            <SignOutButton variant="menu" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
