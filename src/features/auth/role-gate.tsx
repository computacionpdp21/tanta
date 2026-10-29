import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { puede } from "@/lib/permisos";
import type { RolUsuario } from "@/types/database";

interface RoleGateProps {
  roles: readonly RolUsuario[];
  children: ReactNode;
}

export function RoleGate({ roles, children }: RoleGateProps) {
  const { rol } = useAuth();
  if (!puede(rol, roles)) {
    return <Navigate to="/sin-permiso" replace />;
  }
  return children;
}
