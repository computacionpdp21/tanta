import { useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyPlus, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExitoDialog } from "@/features/pedidos/exito-dialog";
import { ProductPicker } from "@/features/pedidos/product-picker";
import { createPedidoSchema, type PedidoFormValues } from "@/features/pedidos/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGuardarPedido } from "@/hooks/use-pedidos";
import { useProductos } from "@/hooks/use-productos";
import { METODO_PAGO_LABELS } from "@/lib/constants";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import { formatBs } from "@/lib/formatters";
import { normalizarTelefonoBO, telefonoLocal } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { PedidoCompleto, PedidoConTotales, PedidoItem, Producto } from "@/types/database";

const ITEM_VACIO: PedidoFormValues["items"][number] = {
  producto_id: null,
  descripcion: "",
  cantidad: 1,
  precio_unitario: 0,
  notas_item: "",
};

function defaultsFromPedido(pedido: PedidoCompleto | null): PedidoFormValues {
  if (!pedido) {
    return {
      cliente_nombre: "",
      cliente_telefono: "",
      tipo_entrega: "recojo",
      direccion: "",
      referencia_ubicacion: "",
      fecha_entrega: toDateInputValue(),
      hora_entrega: "10:00",
      adelanto: 0,
      metodo_pago_adelanto: null,
      costo_envio: 0,
      notas: "",
      items: [{ ...ITEM_VACIO }],
    };
  }

  return {
    cliente_nombre: pedido.cliente_nombre,
    cliente_telefono: telefonoLocal(pedido.cliente_telefono),
    tipo_entrega: pedido.tipo_entrega,
    direccion: pedido.direccion ?? "",
    referencia_ubicacion: pedido.referencia_ubicacion ?? "",
    fecha_entrega: pedido.fecha_entrega,
    hora_entrega: pedido.hora_entrega ? pedido.hora_entrega.slice(0, 5) : "10:00",
    adelanto: pedido.adelanto,
    metodo_pago_adelanto: pedido.metodo_pago_adelanto,
    costo_envio: pedido.costo_envio,
    notas: pedido.notas ?? "",
    items: pedido.items.map((item) => ({
      producto_id: item.producto_id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      notas_item: item.notas_item ?? "",
    })),
  };
}

interface PedidoFormProps {
  pedido?: PedidoCompleto | null;
}

export function PedidoForm({ pedido = null }: PedidoFormProps) {
  const navigate = useNavigate();
  const productosQuery = useProductos(true);
  const guardar = useGuardarPedido();
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState<PedidoConTotales | null>(null);
  const [savedItems, setSavedItems] = useState<PedidoItem[]>([]);

  const schema = useMemo(() => createPedidoSchema(Boolean(pedido)), [pedido]);
  const form = useForm<PedidoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFromPedido(pedido),
    mode: "onBlur",
  });

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    form.reset(defaultsFromPedido(pedido));
  }, [pedido, form]);

  const values = form.watch();
  const itemsForm = values.items ?? [];
  const subtotal = itemsForm.reduce(
    (sum, item) => sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0,
  );
  const envio = values.tipo_entrega === "envio" ? Number(values.costo_envio || 0) : 0;
  const total = subtotal + envio;
  const adelanto = Number(values.adelanto || 0);
  const saldo = total - adelanto;

  const dirty = form.formState.isDirty && !saved;
  const blocker = useBlocker(dirty);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const productos = productosQuery.data ?? [];

  function etiquetaProducto(item: PedidoFormValues["items"][number]): string {
    if (!item.producto_id) {
      return item.descripcion || "Otro (descripción libre)";
    }
    return item.descripcion || "Producto del catálogo";
  }

  function applyProducto(index: number, producto: Producto | null) {
    if (!producto) {
      form.setValue(`items.${index}.producto_id`, null, { shouldDirty: true });
      form.setValue(`items.${index}.descripcion`, "", { shouldDirty: true });
      return;
    }
    form.setValue(`items.${index}.producto_id`, producto.id, { shouldDirty: true });
    form.setValue(`items.${index}.descripcion`, `${producto.nombre} ${producto.tamano}`, {
      shouldDirty: true,
    });
    form.setValue(`items.${index}.precio_unitario`, producto.precio_base, { shouldDirty: true });
  }

  async function onSubmit(data: PedidoFormValues) {
    const telefono = normalizarTelefonoBO(data.cliente_telefono);
    if (!telefono) {
      form.setError("cliente_telefono", {
        message: "Usa un celular boliviano de 8 dígitos que empiece con 6 o 7",
      });
      return;
    }

    try {
      const result = await guardar.mutateAsync({
        id: pedido?.id,
        cliente_nombre: data.cliente_nombre.trim(),
        cliente_telefono: telefono,
        tipo_entrega: data.tipo_entrega,
        direccion: data.tipo_entrega === "envio" ? (data.direccion ?? "").trim() : null,
        referencia_ubicacion: (data.referencia_ubicacion ?? "").trim() || null,
        fecha_entrega: data.fecha_entrega,
        hora_entrega: data.hora_entrega,
        adelanto: data.adelanto,
        metodo_pago_adelanto: data.adelanto > 0 ? data.metodo_pago_adelanto : null,
        costo_envio: data.tipo_entrega === "envio" ? data.costo_envio : 0,
        notas: (data.notas ?? "").trim() || null,
        items: data.items.map((item) => ({
          producto_id: item.producto_id,
          descripcion: item.descripcion.trim(),
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          notas_item: (item.notas_item ?? "").trim() || null,
        })),
      });

      const items: PedidoItem[] = data.items.map((item, index) => ({
        id: `tmp-${index}`,
        pedido_id: result.id,
        producto_id: item.producto_id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        notas_item: (item.notas_item ?? "").trim() || null,
        created_at: result.created_at,
        updated_at: result.updated_at,
      }));

      setSavedItems(items);
      setSaved(result);
      form.reset(data);
      toast.success(`Pedido ${result.numero_formateado} guardado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el pedido");
    }
  }

  function onNuevo() {
    setSaved(null);
    form.reset(defaultsFromPedido(null));
    navigate("/pedidos/nuevo");
  }

  if (pedido && (pedido.estado === "entregado" || pedido.estado === "cancelado")) {
    return (
      <p className="text-muted-foreground">
        Este pedido está {pedido.estado === "entregado" ? "entregado" : "cancelado"} y ya no se
        puede editar.
      </p>
    );
  }

  return (
    <>
      <form className="space-y-6 pb-36" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <section className="bg-card space-y-4 rounded-2xl border p-4">
          <h2 className="font-display text-lg font-semibold">Cliente</h2>
          <div className="space-y-2">
            <Label htmlFor="cliente_nombre">Nombre</Label>
            <Input
              id="cliente_nombre"
              autoComplete="name"
              placeholder="Nombre y apellido"
              {...form.register("cliente_nombre")}
              aria-invalid={Boolean(form.formState.errors.cliente_nombre)}
              aria-describedby="cliente_nombre-error"
            />
            <FieldError
              id="cliente_nombre-error"
              message={form.formState.errors.cliente_nombre?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente_telefono">Teléfono</Label>
            <div className="flex">
              <span className="border-input text-muted-foreground flex h-11 items-center rounded-l-xl border border-r-0 px-3 text-sm">
                +591
              </span>
              <Input
                id="cliente_telefono"
                className="rounded-l-none"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="7XXXXXXX"
                maxLength={11}
                {...form.register("cliente_telefono")}
                aria-invalid={Boolean(form.formState.errors.cliente_telefono)}
                aria-describedby="cliente_telefono-error"
              />
            </div>
            <p className="text-muted-foreground text-xs">8 dígitos, empieza con 6 o 7. Puedes pegar +591.</p>
            <FieldError
              id="cliente_telefono-error"
              message={form.formState.errors.cliente_telefono?.message}
            />
          </div>
        </section>

        <section className="bg-card space-y-4 rounded-2xl border p-4">
          <h2 className="font-display text-lg font-semibold">Entrega</h2>
          <Controller
            control={form.control}
            name="tipo_entrega"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {(["recojo", "envio"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => field.onChange(tipo)}
                    className={cn(
                      "min-h-14 rounded-2xl border-2 px-3 text-sm font-semibold",
                      field.value === tipo
                        ? "border-primary bg-secondary text-secondary-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {tipo === "recojo" ? "Recojo en tienda" : "Envío"}
                  </button>
                ))}
              </div>
            )}
          />
          {values.tipo_entrega === "envio" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Textarea
                  id="direccion"
                  placeholder="Calle, zona, número"
                  {...form.register("direccion")}
                  aria-describedby="direccion-error"
                />
                <FieldError id="direccion-error" message={form.formState.errors.direccion?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referencia_ubicacion">Referencia o link de Maps</Label>
                <Input
                  id="referencia_ubicacion"
                  placeholder="Frente al mercado, o https://maps.app.goo.gl/…"
                  {...form.register("referencia_ubicacion")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costo_envio">Costo de envío (Bs)</Label>
                <Input
                  id="costo_envio"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  {...form.register("costo_envio")}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label>Fecha de entrega</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Hoy", value: fechaConOffset(0) },
                { label: "Mañana", value: fechaConOffset(1) },
                { label: "Pasado", value: fechaConOffset(2) },
              ].map((atajo) => (
                <Button
                  key={atajo.label}
                  type="button"
                  variant={values.fecha_entrega === atajo.value ? "default" : "outline"}
                  onClick={() => form.setValue("fecha_entrega", atajo.value, { shouldDirty: true })}
                >
                  {atajo.label}
                </Button>
              ))}
            </div>
            <Input type="date" {...form.register("fecha_entrega")} aria-describedby="fecha-error" />
            <FieldError id="fecha-error" message={form.formState.errors.fecha_entrega?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora_entrega">Hora</Label>
            <Input id="hora_entrega" type="time" {...form.register("hora_entrega")} />
            <FieldError
              id="hora-error"
              message={form.formState.errors.hora_entrega?.message}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Ítems</h2>
            <Button type="button" variant="outline" onClick={() => append({ ...ITEM_VACIO })}>
              <Plus className="size-4" />
              Agregar ítem
            </Button>
          </div>
          {form.formState.errors.items?.root?.message ||
          typeof form.formState.errors.items?.message === "string" ? (
            <FieldError
              id="items-error"
              message={
                form.formState.errors.items?.root?.message ??
                form.formState.errors.items?.message
              }
            />
          ) : null}

          {fields.map((field, index) => {
            const item = itemsForm[index];
            const filaSubtotal =
              Number(item?.cantidad || 0) * Number(item?.precio_unitario || 0);
            return (
              <div key={field.id} className="bg-card space-y-3 rounded-2xl border p-4">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-start py-2 whitespace-normal"
                    onClick={() => setPickerIndex(index)}
                  >
                    {etiquetaProducto(item ?? ITEM_VACIO)}
                  </Button>
                  {!item?.producto_id ? (
                    <Input
                      placeholder="Describe el producto"
                      {...form.register(`items.${index}.descripcion`)}
                    />
                  ) : null}
                  <FieldError
                    id={`item-${index}-desc`}
                    message={form.formState.errors.items?.[index]?.descripcion?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Quitar uno"
                        onClick={() =>
                          form.setValue(
                            `items.${index}.cantidad`,
                            Math.max(1, Number(item?.cantidad || 1) - 1),
                            { shouldDirty: true },
                          )
                        }
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Input
                        className="text-center"
                        inputMode="numeric"
                        {...form.register(`items.${index}.cantidad`)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Agregar uno"
                        onClick={() =>
                          form.setValue(
                            `items.${index}.cantidad`,
                            Number(item?.cantidad || 1) + 1,
                            { shouldDirty: true },
                          )
                        }
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Precio unitario (Bs)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      {...form.register(`items.${index}.precio_unitario`)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nota del ítem</Label>
                  <Input
                    placeholder="Relleno, nombre en la wawa…"
                    {...form.register(`items.${index}.notas_item`)}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Subtotal {formatBs(filaSubtotal)}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Duplicar ítem"
                      onClick={() => insert(index + 1, { ...item })}
                    >
                      <CopyPlus className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Eliminar ítem"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="bg-card space-y-4 rounded-2xl border p-4">
          <h2 className="font-display text-lg font-semibold">Pago y notas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adelanto">Adelanto (Bs)</Label>
              <Input
                id="adelanto"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                {...form.register("adelanto")}
                aria-describedby="adelanto-error"
              />
              <FieldError id="adelanto-error" message={form.formState.errors.adelanto?.message} />
            </div>
            <div className="space-y-2">
              <Label>Método del adelanto</Label>
              <Controller
                control={form.control}
                name="metodo_pago_adelanto"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "ninguno"}
                    onValueChange={(value) =>
                      field.onChange(value === "ninguno" ? null : value)
                    }
                  >
                    <SelectTrigger aria-describedby="metodo-error">
                      <SelectValue placeholder="Sin adelanto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin adelanto</SelectItem>
                      {Object.entries(METODO_PAGO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                id="metodo-error"
                message={form.formState.errors.metodo_pago_adelanto?.message}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas del pedido</Label>
            <Textarea
              id="notas"
              placeholder="Dedicatoria, observaciones…"
              {...form.register("notas")}
            />
          </div>
        </section>
      </form>

      <div className="border-border bg-card/95 supports-backdrop-filter:bg-card/90 fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t px-4 py-3 shadow-[0_-8px_24px_rgba(61,36,18,0.08)] backdrop-blur-md dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatBs(subtotal)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Envío</dt>
              <dd className="font-medium">{formatBs(envio)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{formatBs(total)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saldo</dt>
              <dd className="text-primary font-semibold">{formatBs(saldo)}</dd>
            </div>
          </dl>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={guardar.isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {guardar.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar pedido"
            )}
          </Button>
        </div>
      </div>

      <ProductPicker
        open={pickerIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPickerIndex(null);
        }}
        productos={productos}
        onSelect={(producto) => {
          if (pickerIndex === null) return;
          applyProducto(pickerIndex, producto);
        }}
      />

      <ExitoDialog
        open={Boolean(saved)}
        pedido={saved}
        items={savedItems}
        onNuevo={onNuevo}
      />

      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Si sales ahora, se pierde lo que escribiste. ¿Salir de todos modos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
