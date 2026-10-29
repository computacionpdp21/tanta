import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/error-boundary";
import { InstallPrompt } from "@/components/install-prompt";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaUpdate } from "@/components/pwa-update";
import { useRealtimePedidos } from "@/hooks/use-realtime-pedidos";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase";

const TITLES: Record<string, { title: string; description: string }> = {
  "/pedidos": {
    title: "Pedidos",
    description: "Lista del día, producción y saldos por cobrar.",
  },
  "/pedidos/nuevo": {
    title: "Nuevo pedido",
    description: "Regístralo mientras lees el WhatsApp, en menos de un minuto.",
  },
  "/produccion": {
    title: "Producción",
    description: "Cuánto hornear hoy, por producto y tamaño.",
  },
  "/entregas": {
    title: "Entregas",
    description: "Recojos, envíos y saldo por cobrar.",
  },
  "/productos": {
    title: "Catálogo",
    description: "Precios base sugeridos; el precio final se edita en cada pedido.",
  },
  "/resumen": {
    title: "Resumen",
    description: "Ventas, adelantos y lo que falta cobrar.",
  },
  "/usuarios": {
    title: "Usuarios",
    description: "Roles de ventas, producción y entregas.",
  },
  "/cuenta": {
    title: "Mi cuenta",
    description: "Tu perfil, contraseña e instalación en el celular.",
  },
};

function titleFor(pathname: string) {
  if (pathname.endsWith("/editar")) {
    return {
      title: "Editar pedido",
      description: "Corrige datos o ítems. El número del pedido no cambia.",
    };
  }
  if (pathname.startsWith("/pedidos/") && pathname !== "/pedidos/nuevo") {
    return { title: "Detalle del pedido", description: "Datos, ítems y acciones según tu rol." };
  }
  if (pathname === "/sin-permiso") {
    return { title: "Sin permiso", description: "Esta pantalla no está disponible para tu rol." };
  }
  return (
    TITLES[pathname] ?? {
      title: "Panadería Janeth",
      description: "Pedidos de tantawawas y panadería",
    }
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const { title, description } = titleFor(pathname);
  const realtime = useRealtimePedidos();

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  return (
    <div className="bg-background flex min-h-dvh">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <PwaUpdate />
        <InstallPrompt />
        <OfflineBanner />
        <Header title={title} description={description} realtime={realtime} />
        {!isSupabaseConfigured ? (
          <div className="bg-accent/20 text-foreground border-b border-accent/30 px-4 py-2 text-center text-sm">
            Falta configurar Supabase. Completa <code className="font-semibold">.env</code> con{" "}
            <code className="font-semibold">VITE_SUPABASE_URL</code> y{" "}
            <code className="font-semibold">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 lg:px-8 lg:py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <ErrorBoundary key={pathname} compact>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
