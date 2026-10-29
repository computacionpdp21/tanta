import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Wheat } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ProductoFormDialog } from "@/features/productos/producto-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useGuardarProducto, useProductos, useReordenarProductos } from "@/hooks/use-productos";
import { formatBs } from "@/lib/formatters";
import type { Producto } from "@/types/database";

function groupByNombre(productos: Producto[]): { nombre: string; items: Producto[] }[] {
  const map = new Map<string, Producto[]>();
  for (const producto of productos) {
    const list = map.get(producto.nombre) ?? [];
    list.push(producto);
    map.set(producto.nombre, list);
  }
  return [...map.entries()].map(([nombre, items]) => ({
    nombre,
    items: [...items].sort((a, b) => a.orden - b.orden),
  }));
}

export function ProductosPage() {
  const { data, isLoading, error } = useProductos(false);
  const guardar = useGuardarProducto();
  const reordenar = useReordenarProductos();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

  const grupos = useMemo(() => groupByNombre(data ?? []), [data]);
  const siguienteOrden = (data ?? []).reduce((max, item) => Math.max(max, item.orden), 0) + 10;

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(producto: Producto) {
    setEditing(producto);
    setOpen(true);
  }

  async function toggleActivo(producto: Producto) {
    try {
      await guardar.mutateAsync({
        id: producto.id,
        nombre: producto.nombre,
        tamano: producto.tamano,
        precio_base: producto.precio_base,
        activo: !producto.activo,
        orden: producto.orden,
      });
      toast.success(producto.activo ? "Producto desactivado" : "Producto activado");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "No se pudo actualizar");
    }
  }

  async function mover(producto: Producto, direccion: -1 | 1) {
    const grupo = grupos.find((item) => item.nombre === producto.nombre);
    if (!grupo) return;
    const index = grupo.items.findIndex((item) => item.id === producto.id);
    const vecino = grupo.items[index + direccion];
    if (!vecino) return;
    try {
      await reordenar.mutateAsync([
        { id: producto.id, orden: vecino.orden },
        { id: vecino.id, orden: producto.orden },
      ]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "No se pudo reordenar");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Wheat}
        title="No se pudo cargar el catálogo"
        description={error instanceof Error ? error.message : "Inténtalo de nuevo."}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      {grupos.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="Todavía no hay productos"
          description="Agrega tantawawas, caballitos u otros tamaños para sugerir precios al registrar pedidos."
        >
          <Button type="button" onClick={openCreate}>
            Crear el primero
          </Button>
        </EmptyState>
      ) : (
        grupos.map((grupo) => (
          <Card key={grupo.nombre}>
            <CardHeader>
              <CardTitle>{grupo.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grupo.items.map((producto, index) => (
                <div
                  key={producto.id}
                  className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{producto.tamano}</p>
                      {!producto.activo ? <Badge variant="outline">Inactivo</Badge> : null}
                    </div>
                    <p className="text-muted-foreground text-sm">{formatBs(producto.precio_base)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Subir"
                      disabled={index === 0 || reordenar.isPending}
                      onClick={() => void mover(producto, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Bajar"
                      disabled={index === grupo.items.length - 1 || reordenar.isPending}
                      onClick={() => void mover(producto, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Switch
                      checked={producto.activo}
                      onCheckedChange={() => void toggleActivo(producto)}
                      aria-label={producto.activo ? "Desactivar" : "Activar"}
                    />
                    <Button type="button" variant="outline" onClick={() => openEdit(producto)}>
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <ProductoFormDialog
        open={open}
        onOpenChange={setOpen}
        producto={editing}
        siguienteOrden={siguienteOrden}
      />
    </div>
  );
}
