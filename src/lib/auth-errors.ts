const AUTH_NOTICE_KEY = "janeth_auth_notice";

export type AuthNotice = "inactive" | "missing_profile" | "expired";

export function setAuthNotice(notice: AuthNotice) {
  sessionStorage.setItem(AUTH_NOTICE_KEY, notice);
}

export function consumeAuthNotice(): AuthNotice | null {
  const value = sessionStorage.getItem(AUTH_NOTICE_KEY);
  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  if (value === "inactive" || value === "missing_profile" || value === "expired") return value;
  return null;
}

export function mensajeAuthNotice(notice: AuthNotice): string {
  if (notice === "inactive") {
    return "Tu cuenta está desactivada, contacta al administrador";
  }
  if (notice === "expired") {
    return "Tu sesión caducó. Entra de nuevo.";
  }
  return "No encontramos tu perfil. Contacta al administrador.";
}

export function mensajeErrorAuth(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const text = raw.toLowerCase();

  if (
    text.includes("failed to fetch") ||
    text.includes("network") ||
    text.includes("fetch")
  ) {
    return "Sin conexión. Revisa internet e inténtalo de nuevo.";
  }
  if (text.includes("invalid login") || text.includes("invalid_credentials")) {
    return "Correo o contraseña incorrectos";
  }
  if (text.includes("email not confirmed")) {
    return "El correo aún no está confirmado. Pide al administrador que lo active.";
  }
  if (text.includes("too many requests") || text.includes("rate")) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  if (text.includes("user banned") || text.includes("disabled")) {
    return "Tu cuenta está desactivada, contacta al administrador";
  }
  return raw || "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export function mensajeErrorSupabase(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error. Inténtalo de nuevo.";
}
