import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import { asRecord, asRecordArray, mapPerfil } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";
import type { RolUsuario } from "@/types/database";

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
}

function mapUsuario(row: Record<string, unknown>): UsuarioAdmin {
  const perfil = mapPerfil(row);
  return {
    ...perfil,
    email: typeof row.email === "string" ? row.email : "",
  };
}

export function useUsuariosAdmin() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async (): Promise<UsuarioAdmin[]> => {
      const { data, error } = await requireSupabase().rpc("admin_listar_usuarios");
      if (error) throw new Error(mensajeErrorSupabase(error));
      return asRecordArray(data).map(mapUsuario);
    },
  });
}

export function useActualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      nombre: string;
      rol: RolUsuario;
      activo: boolean;
    }): Promise<UsuarioAdmin> => {
      const { data, error } = await requireSupabase().rpc("admin_actualizar_perfil", {
        p_id: input.id,
        p_nombre: input.nombre,
        p_rol: input.rol,
        p_activo: input.activo,
      });
      if (error) throw new Error(mensajeErrorSupabase(error));
      const row = asRecord(data);
      if (!row) throw new Error("No se recibió el usuario actualizado.");
      return mapUsuario(row);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}
