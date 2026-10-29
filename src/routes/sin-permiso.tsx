import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { rutaInicio } from "@/lib/permisos";

export function SinPermisoPage() {
  const { rol } = useAuth();
  const home = rol ? rutaInicio(rol) : "/login";

  return (
    <EmptyState
      icon={ShieldOff}
      title="No tienes permiso para ver esto"
      description="Esta pantalla es para otro rol. Si crees que es un error, pide al administrador que revise tu cuenta."
    >
      <Button asChild>
        <Link to={home}>Volver al inicio</Link>
      </Button>
    </EmptyState>
  );
}
