import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { rutaInicio } from "@/lib/permisos";

export function RoleHomeRedirect() {
  const { rol } = useAuth();
  if (!rol) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={rutaInicio(rol)} replace />;
}
