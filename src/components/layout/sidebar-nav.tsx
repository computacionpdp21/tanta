import { BrandMark } from "@/components/brand-mark";
import { AppNavLink } from "@/components/layout/nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/auth-context";
import { ACCOUNT_NAV, PRIMARY_NAV, ROL_LABELS, SECONDARY_NAV } from "@/lib/constants";
import { puede } from "@/lib/permisos";

export function SidebarNav() {
  const { perfil, rol } = useAuth();
  const primary = PRIMARY_NAV.filter((item) => puede(rol, item.roles));
  const secondary = SECONDARY_NAV.filter((item) => puede(rol, item.roles));

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r lg:flex no-print">
      <div className="px-4 py-5">
        <BrandMark />
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
        {primary.map((item) => (
          <AppNavLink key={item.to} {...item} />
        ))}
        {secondary.length > 0 ? (
          <>
            <Separator className="my-3" />
            <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
              Administración
            </p>
            {secondary.map((item) => (
              <AppNavLink key={item.to} {...item} />
            ))}
          </>
        ) : null}
      </nav>
      <div className="mt-auto space-y-2 p-4">
        <div className="bg-card text-card-foreground flex items-center justify-between gap-2 rounded-xl px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{perfil?.nombre}</p>
            {rol ? (
              <Badge variant="secondary" className="mt-1">
                {ROL_LABELS[rol]}
              </Badge>
            ) : null}
          </div>
          <ThemeToggle />
        </div>
        <AppNavLink {...ACCOUNT_NAV} />
        <SignOutButton />
      </div>
    </aside>
  );
}
