import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

function mensajeDeError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `Error ${error.status}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No perdimos los pedidos. Toca reintentar.";
}

export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const detalle = mensajeDeError(error);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Algo se trabó</h1>
      <p className="text-muted-foreground max-w-md text-sm">{detalle}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/pedidos")}>
          Ir a pedidos
        </Button>
      </div>
    </div>
  );
}
