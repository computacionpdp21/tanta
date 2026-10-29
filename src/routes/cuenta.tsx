import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallHelp } from "@/components/install-help";
import { ThemeSelect } from "@/components/theme-select";
import { useAuth } from "@/features/auth/auth-context";
import { ROL_DESCRIPCIONES, ROL_LABELS } from "@/lib/constants";
import { requireSupabase } from "@/lib/supabase";

function fuerzaClave(value: string): { nivel: "débil" | "media" | "fuerte"; texto: string } {
  if (value.length < 10) return { nivel: "débil", texto: "Mínimo 10 caracteres" };
  const clases =
    Number(/[a-zA-Z]/.test(value)) + Number(/\d/.test(value)) + Number(/[^a-zA-Z0-9]/.test(value));
  if (clases >= 3 && value.length >= 12) return { nivel: "fuerte", texto: "Contraseña fuerte" };
  if (clases >= 2) return { nivel: "media", texto: "Aceptable; mejor si mezclas letras, números y un símbolo" };
  return { nivel: "débil", texto: "Mezcla letras y números" };
}

export function CuentaPage() {
  const { user, perfil, rol, signOut } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const fuerza = useMemo(() => fuerzaClave(nueva), [nueva]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nueva.length < 10) {
      toast.error("La contraseña nueva debe tener al menos 10 caracteres");
      return;
    }
    if (nueva !== confirmacion) {
      toast.error("La confirmación no coincide");
      return;
    }
    if (!user?.email) {
      toast.error("No encontramos tu correo");
      return;
    }
    setGuardando(true);
    try {
      const client = requireSupabase();
      const { error: loginError } = await client.auth.signInWithPassword({
        email: user.email,
        password: actual,
      });
      if (loginError) {
        toast.error("La contraseña actual no es correcta");
        return;
      }
      const { error } = await client.auth.updateUser({ password: nueva });
      if (error) {
        toast.error(error.message || "No se pudo cambiar la contraseña");
        return;
      }
      setActual("");
      setNueva("");
      setConfirmacion("");
      toast.success("Contraseña actualizada");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "No se pudo cambiar la contraseña");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Nombre: </span>
            {perfil?.nombre}
          </p>
          <p>
            <span className="text-muted-foreground">Correo: </span>
            {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Rol: </span>
            {rol ? ROL_LABELS[rol] : ""}
          </p>
          {rol ? <p className="text-muted-foreground">{ROL_DESCRIPCIONES[rol]}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSelect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="clave-actual">Contraseña actual</Label>
              <Input
                id="clave-actual"
                type="password"
                autoComplete="current-password"
                value={actual}
                onChange={(event) => setActual(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="clave-nueva">Contraseña nueva</Label>
              <Input
                id="clave-nueva"
                type="password"
                autoComplete="new-password"
                value={nueva}
                onChange={(event) => setNueva(event.target.value)}
                minLength={10}
                required
              />
              {nueva ? (
                <p
                  className={
                    fuerza.nivel === "fuerte"
                      ? "text-success text-sm"
                      : fuerza.nivel === "media"
                        ? "text-accent text-sm"
                        : "text-destructive text-sm"
                  }
                >
                  {fuerza.texto}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">Mínimo 10 caracteres.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="clave-confirm">Confirmar contraseña</Label>
              <Input
                id="clave-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(event) => setConfirmacion(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <InstallHelp />

      <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
