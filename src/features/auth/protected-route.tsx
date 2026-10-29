import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthSplash } from "@/components/auth-splash";
import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute() {
  const { loading, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthSplash />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
