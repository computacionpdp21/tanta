import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { FieldError } from "@/components/field-error";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplash } from "@/components/auth-splash";
import { useAuth } from "@/features/auth/auth-context";
import { mensajeErrorAuth } from "@/lib/auth-errors";
import { APP_NAME } from "@/lib/constants";
import { rutaInicio } from "@/lib/permisos";

export function LoginPage() {
  const { loading, session, rol, signIn, notice, clearNotice, isConfigured } = useAuth();
  const location = useLocation();
  const from =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Entrar · ${APP_NAME}`;
  }, []);

  if (loading) {
    return <AuthSplash />;
  }

  if (session && rol) {
    return <Navigate to={from && from !== "/login" ? from : rutaInicio(rol)} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(mensajeErrorAuth(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-texture relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" className="flex-col justify-center gap-4 text-center" />
          <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
            Pedidos de tantawawas y panadería · Santa Cruz de la Sierra
          </p>
        </div>

        <form
          className="bg-card space-y-4 rounded-3xl border p-6 shadow-warm"
          onSubmit={onSubmit}
          noValidate
        >
          {!isConfigured ? (
            <p className="text-destructive text-sm" role="alert">
              Falta configurar Supabase en el archivo .env.
            </p>
          ) : null}

          {notice ? (
            <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-sm" role="alert">
              {notice}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </Button>
            </div>
          </div>

          {error ? <FieldError id="login-error" message={error} /> : null}

          <Button type="submit" variant="accent" className="w-full" size="lg" disabled={submitting || !isConfigured}>
            {submitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
