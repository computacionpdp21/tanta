import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
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
import { Switch } from "@/components/ui/switch";
import { useGuardarProducto } from "@/hooks/use-productos";
import { formatBs } from "@/lib/formatters";
import type { Producto } from "@/types/database";

const schema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre"),
  tamano: z.string().trim().min(1, "Escribe el tamaño"),
  precio_base: z.coerce.number().min(0, "El precio no puede ser negativo"),
  activo: z.boolean(),
  orden: z.coerce.number().int(),
});

type FormValues = z.infer<typeof schema>;

interface ProductoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: Producto | null;
  siguienteOrden: number;
}

export function ProductoFormDialog({
  open,
  onOpenChange,
  producto,
  siguienteOrden,
}: ProductoFormDialogProps) {
  const guardar = useGuardarProducto();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      tamano: "",
      precio_base: 0,
      activo: true,
      orden: siguienteOrden,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      producto
        ? {
            nombre: producto.nombre,
            tamano: producto.tamano,
            precio_base: producto.precio_base,
            activo: producto.activo,
            orden: producto.orden,
          }
        : {
            nombre: "",
            tamano: "",
            precio_base: 0,
            activo: true,
            orden: siguienteOrden,
          },
    );
  }, [open, producto, siguienteOrden, form]);

  const precio = form.watch("precio_base");

  async function onSubmit(values: FormValues) {
    try {
      await guardar.mutateAsync({
        id: producto?.id,
        ...values,
      });
      toast.success(producto ? "Producto actualizado" : "Producto creado");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            El precio base es una sugerencia. En cada pedido se puede cambiar.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" placeholder="Tantawawa" {...form.register("nombre")} />
            <FieldError id="nombre-error" message={form.formState.errors.nombre?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tamano">Tamaño</Label>
            <Input id="tamano" placeholder="Grande" {...form.register("tamano")} />
            <FieldError id="tamano-error" message={form.formState.errors.tamano?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio_base">Precio base (Bs)</Label>
            <Input
              id="precio_base"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              {...form.register("precio_base")}
            />
            <p className="text-muted-foreground text-xs">Se verá como {formatBs(Number(precio) || 0)}</p>
            <FieldError id="precio-error" message={form.formState.errors.precio_base?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orden">Orden</Label>
            <Input id="orden" type="number" inputMode="numeric" {...form.register("orden")} />
          </div>
          <Controller
            control={form.control}
            name="activo"
            render={({ field }) => (
              <div className="flex min-h-11 items-center justify-between rounded-xl border px-3">
                <Label htmlFor="activo">Activo en el catálogo</Label>
                <Switch id="activo" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
