import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensajeErrorSupabase } from "@/lib/auth-errors";
import { asRecordArray, mapProducto } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";
import type { Producto } from "@/types/database";

export function useProductos(soloActivos = true) {
  return useQuery({
    queryKey: ["productos", { soloActivos }],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Producto[]> => {
      const client = requireSupabase();
      let query = client.from("productos").select("*").order("orden").order("nombre");
      if (soloActivos) {
        query = query.eq("activo", true);
      }
      const { data, error } = await query;
      if (error) throw new Error(mensajeErrorSupabase(error));
      return asRecordArray(data).map(mapProducto);
    },
  });
}

export interface ProductoInput {
  id?: string;
  nombre: string;
  tamano: string;
  precio_base: number;
  activo: boolean;
  orden: number;
}

export function useGuardarProducto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductoInput) => {
      const client = requireSupabase();
      const payload = {
        nombre: input.nombre.trim(),
        tamano: input.tamano.trim(),
        precio_base: input.precio_base,
        activo: input.activo,
        orden: input.orden,
      };

      const { error } = input.id
        ? await client.from("productos").update(payload).eq("id", input.id)
        : await client.from("productos").insert(payload);

      if (error) {
        if (error.code === "23505") {
          throw new Error("Ya existe un producto con ese nombre y tamaño.");
        }
        throw new Error(mensajeErrorSupabase(error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}

export function useReordenarProductos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pares: { id: string; orden: number }[]) => {
      const client = requireSupabase();
      const results = await Promise.all(
        pares.map((par) =>
          client.from("productos").update({ orden: par.orden }).eq("id", par.id),
        ),
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        throw new Error(mensajeErrorSupabase(failed.error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
}
