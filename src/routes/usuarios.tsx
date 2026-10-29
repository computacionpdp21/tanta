import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-context";
import { useActualizarUsuario, useUsuariosAdmin, type UsuarioAdmin } from "@/hooks/use-usuarios";
import { ROL_DESCRIPCIONES, ROL_LABELS } from "@/lib/constants";
import { formatFechaInstante } from "@/lib/dates";
import { ROLES, type RolUsuario } from "@/types/database";

export function UsuariosPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useUsuariosAdmin();
  const actualizar = useActualizarUsuario();
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolUsuario>("vendedor");
  const [activo, setActivo] = useState(true);

  function abrir(usuario: UsuarioAdmin) {
    setEditando(usuario);
    setNombre(usuario.nombre);
    setRol(usuario.rol);
    setActivo(usuario.activo);
  }

  async function guardar() {
    if (!editando) return;
    try {
      await actualizar.mutateAsync({
        id: editando.id,
        nombre: nombre.trim(),
        rol,
        activo,
      });
      toast.success("Usuario actualizado");
      setEditando(null);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "No se pudo guardar");
    }
  }

  return (
    <div className="space-y-5">
      <details className="bg-card rounded-2xl border p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">¿Cómo agregar un usuario?</summary>
        <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>Entra a Supabase → Authentication → Users → Add user.</li>
          <li>Pon el correo y una contraseña temporal. Marca Auto Confirm User.</li>
          <li>El perfil se crea solo (el sistema le pone rol vendedor).</li>
          <li>Vuelve a esta pantalla, ábrelo y cámbiale el rol o el nombre.</li>
          <li>Para restablecer la contraseña de otra persona: Authentication → Users → el usuario → Send password recovery.</li>
        </ol>
      </details>

      <div className="grid gap-2 rounded-2xl border p-4 text-sm">
        {ROLES.map((item) => (
          <p key={item}>
            <span className="font-semibold">{ROL_LABELS[item]}:</span> {ROL_DESCRIPCIONES[item]}
          </p>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : null}

      {error ? (
        <EmptyState
          icon={Users}
          title="No se pudieron cargar los usuarios"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo."}
        />
      ) : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay usuarios"
          description="Créalos en Authentication de Supabase. El perfil aparece solo."
        />
      ) : null}

      <div className="grid gap-3">
        {data?.map((usuario) => (
          <article key={usuario.id} className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
            <div>
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-muted-foreground text-sm">{usuario.email}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Desde {formatFechaInstante(usuario.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ROL_LABELS[usuario.rol]}</Badge>
              <Badge variant={usuario.activo ? "default" : "outline"}>
                {usuario.activo ? "Activo" : "Inactivo"}
              </Badge>
              <Button type="button" variant="outline" onClick={() => abrir(usuario)}>
                Editar
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(editando)} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              {editando?.email}
              {editando?.id === user?.id ? " (tú)" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="usuario-nombre">Nombre</Label>
              <Input
                id="usuario-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="usuario-rol">Rol</Label>
              <select
                id="usuario-rol"
                className="border-input bg-card h-11 min-h-11 w-full rounded-xl border px-3 text-base"
                value={rol}
                onChange={(event) => setRol(event.target.value as RolUsuario)}
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {ROL_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="usuario-activo">Cuenta activa</Label>
              <Switch id="usuario-activo" checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void guardar()} disabled={actualizar.isPending}>
              {actualizar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
