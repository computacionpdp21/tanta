import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { rutaInicio } from "@/lib/permisos";

export function NoEncontradoPage() {
  const { rol } = useAuth();
  const home = rol ? rutaInicio(rol) : "/login";

  return (
    <EmptyState
      icon={MapPinOff}
      title="No encontramos esa pantalla"
      description="Revisa el enlace o vuelve al inicio para seguir con los pedidos."
    >
      <Button asChild>
        <Link to={home}>Ir al inicio</Link>
      </Button>
    </EmptyState>
  );
}
