import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Phone, Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PrintMeta } from "@/components/print-meta";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CobroDialog } from "@/features/pedidos/cobro-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useEntregasPorFecha } from "@/hooks/use-entregas";
import { useCambiarEstado } from "@/hooks/use-pedidos";
import { formatFechaLarga, formatHora, toDateInputValue } from "@/lib/dates";
import { puedeCambiarEstado } from "@/lib/estados";
import { formatBs, mapsUrl, telUrl, waMeUrl } from "@/lib/formatters";
import { generarTextoWhatsApp, pedidoParaWhatsApp, prepararWhatsApp } from "@/lib/whatsapp";
import { puede, ROLES_COBRAR } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import type { PedidoConTotales, PedidoItem } from "@/types/database";

function resumenItems(items: PedidoItem[]): string {
  return items.map((item) => `${item.cantidad} × ${item.descripcion}`).join(", ");
}

function TarjetaEntrega({
  pedido,
  items,
  onEntregar,
  onCobrar,
  pending,
  puedeEntregar,
  puedeCobrar,
}: {
  pedido: PedidoConTotales;
  items: PedidoItem[];
  onEntregar: () => void;
  onCobrar: () => void;
  pending: boolean;
  puedeEntregar: boolean;
  puedeCobrar: boolean;
}) {
  const listo = pedido.estado === "listo";
  const entregado = pedido.estado === "entregado";
  const maps =
    pedido.tipo_entrega === "envio" && pedido.direccion
      ? mapsUrl(pedido.direccion, pedido.referencia_ubicacion)
      : null;
  const textoWhatsApp = generarTextoWhatsApp(pedidoParaWhatsApp(pedido, items));

  return (
    <article
      className={cn(
        "print-card lift-card rounded-2xl border p-4 shadow-sm",
        listo && "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
        !listo && !entregado && "border-amber-400/80 bg-amber-50/50 dark:bg-amber-950/20",
        entregado && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold">
            {pedido.numero_formateado} · {pedido.cliente_nombre}
          </p>
          <p className="text-muted-foreground text-sm">{formatHora(pedido.hora_entrega)}</p>
        </div>
        <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
      </div>
      <p className="mt-2 text-sm">{resumenItems(items)}</p>
      {pedido.direccion ? <p className="mt-1 text-sm">{pedido.direccion}</p> : null}
      {pedido.saldo > 0 ? (
        <p className="mt-2 rounded-xl bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-900 dark:bg-orange-400/20 dark:text-orange-200">
          El cliente aún debe {formatBs(pedido.saldo)}
        </p>
      ) : (
        <p className="text-success mt-2 text-lg font-bold">Saldo {formatBs(pedido.saldo)}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={telUrl(pedido.cliente_telefono)}>
            <Phone className="size-4" />
            Llamar
          </a>
        </Button>
        <Button asChild variant="whatsapp" size="sm">
          <a
            href={waMeUrl(pedido.cliente_telefono, textoWhatsApp)}
            target="_blank"
            rel="noreferrer"
            onClick={() => prepararWhatsApp(textoWhatsApp)}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
        {maps ? (
          <Button asChild variant="outline" size="sm">
            <a href={maps} target="_blank" rel="noreferrer">
              <MapPin className="size-4" />
              Maps
            </a>
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {puedeEntregar && listo ? (
          <Button type="button" onClick={onEntregar} disabled={pending}>
            Marcar entregado
          </Button>
        ) : null}
        {puedeEntregar && !listo && !entregado ? (
          <p className="text-muted-foreground text-sm">Aún no está listo para entregar.</p>
        ) : null}
        {puedeCobrar && pedido.saldo > 0 ? (
          <Button type="button" variant="accent" onClick={onCobrar}>
            Registrar cobro
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function EntregasPage() {
  const { rol } = useAuth();
  const [fecha, setFecha] = useState(toDateInputValue());
  const { data, isLoading, error } = useEntregasPorFecha(fecha);
  const cambiar = useCambiarEstado();
  const [cobroId, setCobroId] = useState<string | null>(null);
  const puedeCobrar = puede(rol, ROLES_COBRAR);

  const pedidos = useMemo(() => data?.pedidos ?? [], [data]);
  const items = useMemo(() => data?.items ?? [], [data]);
  const recojos = pedidos.filter((pedido) => pedido.tipo_entrega === "recojo");
  const envios = pedidos.filter((pedido) => pedido.tipo_entrega === "envio");
  const cobroPedido = pedidos.find((pedido) => pedido.id === cobroId) ?? null;

  const resumen = useMemo(() => {
    const pendientes = pedidos.filter(
      (pedido) => pedido.estado !== "entregado" && pedido.estado !== "cancelado",
    ).length;
    const listas = pedidos.filter((pedido) => pedido.estado === "listo").length;
    const aCobrar = pedidos.reduce((sum, pedido) => sum + Math.max(pedido.saldo, 0), 0);
    return { pendientes, listas, aCobrar, total: pedidos.length };
  }, [pedidos]);

  async function entregar(id: string, estadoActual: PedidoConTotales["estado"]) {
    if (estadoActual !== "listo") {
      toast.error("Aún no está listo para entregar.");
      return;
    }
    try {
      await cambiar.mutateAsync({ id, estado: "entregado" });
      toast.success("Marcado como entregado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo marcar entregado");
    }
  }

  return (
    <div className="space-y-5 print-entregas">
      <PrintMeta titulo={`Entregas · ${formatFechaLarga(fecha)}`} />
      <div className="no-print flex flex-wrap items-end gap-3">
      <div className="grid max-w-xs gap-1.5">
        <Label htmlFor="fecha-entregas">Fecha</Label>
        <Input id="fecha-entregas" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
      </div>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" />
        Imprimir
      </Button>
      </div>
      <p className="font-display text-xl font-semibold capitalize">{formatFechaLarga(fecha)}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card rounded-2xl border p-3">
          <p className="text-muted-foreground text-xs">Entregas</p>
          <p className="font-display text-2xl font-semibold">{resumen.total}</p>
        </div>
        <div className="bg-card rounded-2xl border p-3">
          <p className="text-muted-foreground text-xs">Pendientes</p>
          <p className="font-display text-2xl font-semibold">{resumen.pendientes}</p>
        </div>
        <div className="bg-card rounded-2xl border p-3">
          <p className="text-muted-foreground text-xs">Listas</p>
          <p className="font-display text-2xl font-semibold">{resumen.listas}</p>
        </div>
        <div className="bg-card rounded-2xl border p-3">
          <p className="text-muted-foreground text-xs">A cobrar</p>
          <p className="font-display text-2xl font-semibold">{formatBs(resumen.aCobrar)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {error ? (
        <EmptyState
          icon={Truck}
          title="No se pudieron cargar las entregas"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo."}
        />
      ) : null}

      {!isLoading && pedidos.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No hay entregas este día"
          description="Cambia la fecha o espera a que ventas registre pedidos."
        />
      ) : null}

      {recojos.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Recojo en tienda</h2>
          {recojos.map((pedido) => (
            <TarjetaEntrega
              key={pedido.id}
              pedido={pedido}
              items={items.filter((item) => item.pedido_id === pedido.id)}
              pending={cambiar.isPending}
              puedeEntregar={puedeCambiarEstado(rol, "listo", "entregado")}
              puedeCobrar={puedeCobrar}
              onEntregar={() => void entregar(pedido.id, pedido.estado)}
              onCobrar={() => setCobroId(pedido.id)}
            />
          ))}
        </section>
      ) : null}

      {envios.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Envíos</h2>
          {envios.map((pedido) => (
            <TarjetaEntrega
              key={pedido.id}
              pedido={pedido}
              items={items.filter((item) => item.pedido_id === pedido.id)}
              pending={cambiar.isPending}
              puedeEntregar={puedeCambiarEstado(rol, "listo", "entregado")}
              puedeCobrar={puedeCobrar}
              onEntregar={() => void entregar(pedido.id, pedido.estado)}
              onCobrar={() => setCobroId(pedido.id)}
            />
          ))}
        </section>
      ) : null}

      <CobroDialog pedido={cobroPedido} open={Boolean(cobroId)} onOpenChange={(open) => !open && setCobroId(null)} />
    </div>
  );
}
