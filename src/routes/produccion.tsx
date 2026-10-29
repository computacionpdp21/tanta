import { useMemo, useState } from "react";
import { ChefHat, Maximize2, Minimize2, Printer } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PrintMeta } from "@/components/print-meta";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/auth-context";
import { useCambiarEstado } from "@/hooks/use-pedidos";
import { consolidarProduccion, useProduccionPorFecha } from "@/hooks/use-produccion";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { fechaConOffset, formatFechaLarga, formatHora, toDateInputValue } from "@/lib/dates";
import { puedeCambiarEstado } from "@/lib/estados";
import { cn } from "@/lib/utils";
import type { PedidoConTotales, PedidoItemConProducto } from "@/types/database";

type AtajoFecha = "hoy" | "manana" | "pasado" | "otra";

function fechaDeAtajo(atajo: AtajoFecha, otra: string): string {
  if (atajo === "hoy") return toDateInputValue();
  if (atajo === "manana") return fechaConOffset(1);
  if (atajo === "pasado") return fechaConOffset(2);
  return otra || toDateInputValue();
}

function Consolidado({
  grupos,
  otros,
  totalUnidades,
  cocina,
}: {
  grupos: ReturnType<typeof consolidarProduccion>["grupos"];
  otros: ReturnType<typeof consolidarProduccion>["otros"];
  totalUnidades: number;
  cocina: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className={cn("font-display font-semibold", cocina ? "text-5xl" : "text-3xl")}>
        {totalUnidades}{" "}
        <span className={cn("font-sans font-medium", cocina ? "text-2xl" : "text-base")}>
          unidades
        </span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
      {grupos.map((grupo) => (
        <div
          key={grupo.nombre}
          className={cn(
            "rounded-2xl border p-4",
            cocina ? "border-amber-500/40 bg-zinc-900" : "bg-secondary/40",
          )}
        >
          <p className={cn("font-display font-semibold", cocina ? "text-3xl" : "text-xl")}>
            {grupo.nombre}
          </p>
          <p className={cn("mt-2 flex flex-wrap gap-x-4 gap-y-1", cocina ? "text-2xl" : "text-lg")}>
            {grupo.tamanos.map((tamano) => (
              <span key={tamano.tamano}>
                <span className="text-muted-foreground">{tamano.tamano}</span>{" "}
                <span className="font-display text-[1.35em] font-bold leading-none">
                  {tamano.cantidad}
                </span>
              </span>
            ))}
          </p>
        </div>
      ))}
      </div>
      {otros.length > 0 ? (
        <div>
          <p className={cn("font-display font-semibold", cocina ? "text-3xl" : "text-xl")}>
            Otros / personalizados
          </p>
          <ul className={cn("mt-1 space-y-1", cocina ? "text-2xl" : "text-base")}>
            {otros.map((item) => (
              <li key={item.descripcion}>
                {item.descripcion}{" "}
                <span className="font-display text-[1.2em] font-bold">{item.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DesglosePedido({
  pedido,
  items,
  cocina,
  onEmpezar,
  onListo,
  pending,
  puedeEmpezar,
  puedeListo,
}: {
  pedido: PedidoConTotales;
  items: PedidoItemConProducto[];
  cocina: boolean;
  onEmpezar: () => void;
  onListo: () => void;
  pending: boolean;
  puedeEmpezar: boolean;
  puedeListo: boolean;
}) {
  return (
    <article
      className={cn(
        "lift-card rounded-2xl border p-4",
        cocina ? "border-amber-500/40 bg-zinc-900" : "bg-card shadow-sm",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={cn("font-display font-semibold", cocina ? "text-2xl" : "text-lg")}>
            {pedido.numero_formateado} · {pedido.cliente_nombre}
          </p>
          <p className={cn(cocina ? "text-lg" : "text-sm text-muted-foreground")}>
            {formatHora(pedido.hora_entrega)} · {TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}
          </p>
        </div>
        <EstadoBadge estado={pedido.estado} />
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <p className={cn("font-medium", cocina ? "text-xl" : "text-sm")}>
              {item.cantidad} × {item.descripcion}
            </p>
            {item.notas_item ? (
              <p
                className={cn(
                  "mt-1 rounded-lg px-2 py-1 font-semibold",
                  cocina ? "bg-amber-400 text-zinc-950 text-lg" : "bg-accent/20 text-sm",
                )}
              >
                {item.notas_item}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        {puedeEmpezar ? (
          <Button type="button" size="lg" onClick={onEmpezar} disabled={pending}>
            Empezar
          </Button>
        ) : null}
        {puedeListo ? (
          <Button type="button" size="lg" variant="accent" onClick={onListo} disabled={pending}>
            Listo
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ProduccionPage() {
  const { rol } = useAuth();
  const [atajo, setAtajo] = useState<AtajoFecha>("hoy");
  const [otraFecha, setOtraFecha] = useState(toDateInputValue());
  const [soloPendiente, setSoloPendiente] = useState(true);
  const [cocina, setCocina] = useState(false);
  const fecha = fechaDeAtajo(atajo, otraFecha);
  const { data, isLoading, error } = useProduccionPorFecha(fecha);
  const cambiar = useCambiarEstado();
  useWakeLock(cocina);

  const pedidos = useMemo(() => data?.pedidos ?? [], [data]);
  const items = useMemo(() => data?.items ?? [], [data]);

  const pedidosFiltrados = useMemo(
    () =>
      soloPendiente
        ? pedidos.filter((pedido) => pedido.estado === "pendiente" || pedido.estado === "en_produccion")
        : pedidos,
    [pedidos, soloPendiente],
  );

  const itemsFiltrados = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map((pedido) => pedido.id));
    return items.filter((item) => ids.has(item.pedido_id));
  }, [items, pedidosFiltrados]);

  const consolidado = useMemo(() => consolidarProduccion(itemsFiltrados), [itemsFiltrados]);
  const listos = pedidos.filter((pedido) => pedido.estado === "listo" || pedido.estado === "entregado").length;
  const totalDia = pedidos.length;

  async function cambiarEstado(id: string, estado: "en_produccion" | "listo") {
    try {
      await cambiar.mutateAsync({ id, estado });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  const contenido = (
    <div className={cn("space-y-5", cocina && "text-amber-50")}>
      <PrintMeta titulo={`Hoja de producción · ${formatFechaLarga(fecha)}`} />
      <div className="no-print flex flex-wrap gap-2">
        {(
          [
            ["hoy", "Hoy"],
            ["manana", "Mañana"],
            ["pasado", "Pasado"],
            ["otra", "Elegir fecha"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <Button
            key={valor}
            type="button"
            variant={atajo === valor ? "default" : "outline"}
            onClick={() => setAtajo(valor)}
          >
            {etiqueta}
          </Button>
        ))}
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir
        </Button>
        <Button type="button" variant="outline" onClick={() => setCocina((value) => !value)}>
          {cocina ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          {cocina ? "Salir de cocina" : "Modo cocina"}
        </Button>
      </div>

      {atajo === "otra" ? (
        <div className="no-print grid max-w-xs gap-1.5">
          <Label htmlFor="fecha-produccion">Fecha</Label>
          <Input
            id="fecha-produccion"
            type="date"
            value={otraFecha}
            onChange={(event) => setOtraFecha(event.target.value)}
          />
        </div>
      ) : null}

      <div>
        <p className={cn("font-display font-semibold capitalize", cocina ? "text-3xl" : "text-2xl")}>
          {formatFechaLarga(fecha)}
        </p>
        {totalDia > 0 ? (
          <div className="mt-3">
            <p className={cocina ? "text-lg" : "text-sm"}>
              {listos} de {totalDia} pedidos listos
            </p>
            <div className="bg-muted mt-2 h-3 overflow-hidden rounded-full">
              <div
                className="bg-success h-full rounded-full"
                style={{ width: `${Math.round((listos / totalDia) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="no-print flex items-center justify-between gap-3">
        <Label htmlFor="solo-pendiente">Solo lo pendiente por hacer</Label>
        <Switch id="solo-pendiente" checked={soloPendiente} onCheckedChange={setSoloPendiente} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {error ? (
        <EmptyState
          icon={ChefHat}
          title="No se pudo cargar producción"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo."}
        />
      ) : null}

      {!isLoading && !error && pedidos.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="No hay pedidos para este día"
          description="Cuando ventas registre uno, aparece aquí solo, sin recargar."
        />
      ) : null}

      {!isLoading && pedidos.length > 0 ? (
        <>
          <section className={cn("rounded-2xl border p-5", cocina ? "border-amber-500/40 bg-zinc-900" : "bg-card")}>
            <h2 className={cn("font-display mb-3 font-semibold", cocina ? "text-2xl" : "text-lg")}>
              Consolidado
            </h2>
            {consolidado.totalUnidades === 0 ? (
              <p>Nada pendiente por hacer.</p>
            ) : (
              <Consolidado
                grupos={consolidado.grupos}
                otros={consolidado.otros}
                totalUnidades={consolidado.totalUnidades}
                cocina={cocina}
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className={cn("font-display font-semibold", cocina ? "text-2xl" : "text-lg")}>
              Por pedido
            </h2>
            {pedidosFiltrados.map((pedido) => (
              <DesglosePedido
                key={pedido.id}
                pedido={pedido}
                items={items.filter((item) => item.pedido_id === pedido.id)}
                cocina={cocina}
                pending={cambiar.isPending}
                puedeEmpezar={puedeCambiarEstado(rol, pedido.estado, "en_produccion")}
                puedeListo={puedeCambiarEstado(rol, pedido.estado, "listo")}
                onEmpezar={() => void cambiarEstado(pedido.id, "en_produccion")}
                onListo={() => void cambiarEstado(pedido.id, "listo")}
              />
            ))}
          </section>
        </>
      ) : null}

      <div className="hidden print:block print-produccion">
        <h1 className="font-display text-2xl font-bold">Hoja de producción · {formatFechaLarga(fecha)}</h1>
        <p className="mt-1">
          {listos} de {totalDia} pedidos listos
        </p>
        <h2 className="mt-4 text-lg font-bold">Consolidado</h2>
        <Consolidado
          grupos={consolidarProduccion(items).grupos}
          otros={consolidarProduccion(items).otros}
          totalUnidades={consolidarProduccion(items).totalUnidades}
          cocina={false}
        />
        <h2 className="mt-6 text-lg font-bold">Por pedido</h2>
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="mt-3 border-t pt-2">
            <p className="font-bold">
              {pedido.numero_formateado} · {pedido.cliente_nombre} · {formatHora(pedido.hora_entrega)} ·{" "}
              {TIPO_ENTREGA_LABELS[pedido.tipo_entrega]}
            </p>
            {items
              .filter((item) => item.pedido_id === pedido.id)
              .map((item) => (
                <p key={item.id}>
                  {item.cantidad} × {item.descripcion}
                  {item.notas_item ? ` — ${item.notas_item}` : ""}
                </p>
              ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (cocina) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 p-5 text-amber-50">
        <div className="mx-auto max-w-4xl pb-16">{contenido}</div>
      </div>
    );
  }

  return contenido;
}
