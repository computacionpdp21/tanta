import { asRecordArray } from "@/lib/mappers";
import { requireSupabase } from "@/lib/supabase";

export async function fetchNombresUsuarios(ids: string[]): Promise<Record<string, string>> {
  const clean = [...new Set(ids.filter((id) => id.length > 0))];
  if (clean.length === 0) return {};
  const client = requireSupabase();
  const { data, error } = await client.from("perfiles").select("id, nombre").in("id", clean);
  if (error) return {};
  const nombres: Record<string, string> = {};
  for (const row of asRecordArray(data)) {
    const id = typeof row.id === "string" ? row.id : "";
    const nombre = typeof row.nombre === "string" ? row.nombre : "";
    if (id) nombres[id] = nombre || "Alguien";
  }
  return nombres;
}
