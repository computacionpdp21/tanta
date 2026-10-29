import type { RolUsuario } from "@/types/database";

export const ROLES_VER_PEDIDOS: RolUsuario[] = [
  "admin",
  "vendedor",
  "operativo",
  "produccion",
  "entregas",
];

export const ROLES_GESTIONAR_PEDIDOS: RolUsuario[] = ["admin", "vendedor", "operativo"];

export const ROLES_PRODUCCION: RolUsuario[] = ["admin", "vendedor", "operativo", "produccion"];

export const ROLES_ENTREGAS: RolUsuario[] = ["admin", "vendedor", "operativo", "entregas"];

export const ROLES_COBRAR: RolUsuario[] = ["admin", "vendedor", "operativo", "entregas"];

export const ROLES_CATALOGO: RolUsuario[] = ["admin"];

export const ROLES_RESUMEN: RolUsuario[] = ["admin"];

export const ROLES_USUARIOS: RolUsuario[] = ["admin"];

export function puede(
  rol: RolUsuario | null | undefined,
  permitidos: readonly RolUsuario[],
): boolean {
  return Boolean(rol && permitidos.includes(rol));
}

export function rutaInicio(rol: RolUsuario): string {
  void rol;
  return "/";
}
