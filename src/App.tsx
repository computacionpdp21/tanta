import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageFallback } from "@/components/page-fallback";
import { RouteError } from "@/components/route-error";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { RoleGate } from "@/features/auth/role-gate";
import { RoleHomeRedirect } from "@/features/auth/role-home-redirect";
import {
  ROLES_CATALOGO,
  ROLES_ENTREGAS,
  ROLES_GESTIONAR_PEDIDOS,
  ROLES_PRODUCCION,
  ROLES_RESUMEN,
  ROLES_USUARIOS,
  ROLES_VER_PEDIDOS,
} from "@/lib/permisos";
import { CuentaPage } from "@/routes/cuenta";
import { EntregasPage } from "@/routes/entregas";
import { LoginPage } from "@/routes/login";
import { NoEncontradoPage } from "@/routes/no-encontrado";
import { NuevoPedidoPage } from "@/routes/nuevo-pedido";
import { PedidoDetallePage } from "@/routes/pedido-detalle";
import { PedidosPage } from "@/routes/pedidos";
import { ProduccionPage } from "@/routes/produccion";
import { ProductosPage } from "@/routes/productos";
import { SinPermisoPage } from "@/routes/sin-permiso";
import { UsuariosPage } from "@/routes/usuarios";

const ReportesPage = lazy(() =>
  import("@/routes/reportes").then((mod) => ({ default: mod.ReportesPage })),
);

function ConSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <RoleHomeRedirect /> },
              {
                path: "pedidos",
                element: (
                  <RoleGate roles={ROLES_VER_PEDIDOS}>
                    <PedidosPage />
                  </RoleGate>
                ),
              },
              {
                path: "pedidos/nuevo",
                element: (
                  <RoleGate roles={ROLES_GESTIONAR_PEDIDOS}>
                    <NuevoPedidoPage />
                  </RoleGate>
                ),
              },
              {
                path: "pedidos/:id/editar",
                element: (
                  <RoleGate roles={ROLES_GESTIONAR_PEDIDOS}>
                    <NuevoPedidoPage />
                  </RoleGate>
                ),
              },
              {
                path: "pedidos/:id",
                element: (
                  <RoleGate roles={ROLES_VER_PEDIDOS}>
                    <PedidoDetallePage />
                  </RoleGate>
                ),
              },
              {
                path: "produccion",
                element: (
                  <RoleGate roles={ROLES_PRODUCCION}>
                    <ProduccionPage />
                  </RoleGate>
                ),
              },
              {
                path: "entregas",
                element: (
                  <RoleGate roles={ROLES_ENTREGAS}>
                    <EntregasPage />
                  </RoleGate>
                ),
              },
              {
                path: "productos",
                element: (
                  <RoleGate roles={ROLES_CATALOGO}>
                    <ProductosPage />
                  </RoleGate>
                ),
              },
              {
                path: "resumen",
                element: (
                  <RoleGate roles={ROLES_RESUMEN}>
                    <ConSuspense>
                      <ReportesPage />
                    </ConSuspense>
                  </RoleGate>
                ),
              },
              {
                path: "usuarios",
                element: (
                  <RoleGate roles={ROLES_USUARIOS}>
                    <UsuariosPage />
                  </RoleGate>
                ),
              },
              { path: "cuenta", element: <CuentaPage /> },
              { path: "sin-permiso", element: <SinPermisoPage /> },
              { path: "*", element: <NoEncontradoPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <LoginPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
