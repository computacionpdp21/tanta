import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, MessageCircle, Phone, Printer, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PrintMeta } from "@/components/print-meta";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CancelarDialog } from "@/features/pedidos/cancelar-dialog";
import { CobroDialog } from "@/features/pedidos/cobro-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useCambiarEstado, usePedido } from "@/hooks/use-pedidos";
import { ESTADO_LABELS, METODO_PAGO_LABELS, TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { formatFecha, formatFechaHora, formatHora } from "@/lib/dates";
import {
  estadoPrevio,
  etiquetaAvance,
  puedeCambiarEstado,
  puedeEditarPedido,
  siguienteEstado,
} from "@/lib/estados";
import { formatBs, formatTelefonoBolivia, mapsUrl, telUrl, waMeUrl } from "@/lib/formatters";
import { puede, ROLES_COBRAR } from "@/lib/permisos";
import { generarTextoWhatsApp } from "@/lib/whatsapp";

export function PedidoDetallePage() {
  const { id } = useParams();
  const { rol } = useAuth();
  const { data, isLoading, error } = usePedido(id);
  const cambiar = useCambiarEstado();
  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [cancelarAbierto, setCancelarAbierto] = useState(false);

  async function copiar() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(generarTextoWhatsApp(data));
      toast.success("Resumen copiado. Pégalo en WhatsApp.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function avanzar() {
    if (!data) return;
    const siguiente = siguienteEstado(data.estado);
    if (!siguiente) return;
    try {
      await cambiar.mutateAsync({ id: data.id, estado: siguiente });
      toast.success(`Pasó a ${ESTADO_LABELS[siguiente]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  async function retroceder() {
    if (!data) return;
    const previo = estadoPrevio(data.estado);
    if (!previo) return;
    try {
      await cambiar.mutateAsync({ id: data.id, estado: previo });
      toast.success(`Volvió a ${ESTADO_LABELS[previo]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo retroceder");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No se pudo abrir el pedido"
        description={error instanceof Error ? error.message : "Revisa el enlace e inténtalo de nuevo."}
      />
    );
  }

  const siguiente = siguienteEstado(data.estado);
  const previo = estadoPrevio(data.estado);
  const puedeAvanzar = siguiente ? puedeCambiarEstado(rol, data.estado, siguiente) : false;
  const puedeRetroceder = previo ? puedeCambiarEstado(rol, data.estado, previo) : false;
  const puedeCancelar = puedeCambiarEstado(rol, data.estado, "cancelado");
  const editable = puedeEditarPedido(rol, data.estado);
  const puedeCobrar = puede(rol, ROLES_COBRAR) && data.saldo > 0;
  const maps =
    data.tipo_entrega === "envio" && data.direccion
      ? mapsUrl(data.direccion, data.referencia_ubicacion)
      : null;

  return (
    <div className="space-y-4 print-pedido">
      <PrintMeta titulo={`Pedido ${data.numero_formateado} · ${data.cliente_nombre}`} />
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold">{data.numero_formateado}</h2>
          <EstadoBadge estado={data.estado} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copiar()}>
            Copiar para WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir
          </Button>
          {editable ? (
            <Button asChild>
              <Link to={`/pedidos/${data.id}/editar`}>Editar</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {puedeAvanzar && siguiente ? (
        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base no-print"
          onClick={() => void avanzar()}
          disabled={cambiar.isPending}
        >
          {etiquetaAvance(data.estado) ?? `Pasar a ${ESTADO_LABELS[siguiente]}`}
        </Button>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-base font-medium">{data.cliente_nombre}</p>
          <p>{formatTelefonoBolivia(data.cliente_telefono)}</p>
          <div className="flex flex-wrap gap-2 no-print">
            <Button asChild variant="outline">
              <a href={telUrl(data.cliente_telefono)}>
                <Phone className="size-4" />
                Llamar
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={waMeUrl(data.cliente_telefono)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{TIPO_ENTREGA_LABELS[data.tipo_entrega]}</p>
          <p>
            {formatFecha(data.fecha_entrega, "EEEE d/MM")}
            {data.hora_entrega ? ` · ${formatHora(data.hora_entrega)}` : ""}
          </p>
          {data.direccion ? <p>{data.direccion}</p> : null}
          {data.referencia_ubicacion ? (
            <p className="text-muted-foreground break-all">{data.referencia_ubicacion}</p>
          ) : null}
          {maps ? (
            <Button asChild variant="outline" className="no-print">
              <a href={maps} target="_blank" rel="noreferrer">
                <MapPin className="size-4" />
                Abrir en Google Maps
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ítems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">
                  {item.cantidad} × {item.descripcion}
                </p>
                {item.notas_item ? (
                  <p className="bg-accent/15 mt-1 rounded-lg px-2 py-1 text-sm font-medium">
                    {item.notas_item}
                  </p>
                ) : null}
              </div>
              <p className="font-semibold">{formatBs(item.cantidad * item.precio_unitario)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Subtotal ítems {formatBs(data.subtotal_items)}</p>
          {data.costo_envio > 0 ? <p>Envío {formatBs(data.costo_envio)}</p> : null}
          <p className="font-medium">Total {formatBs(data.total)}</p>
          <p>
            Adelanto {formatBs(data.adelanto)}
            {data.metodo_pago_adelanto ? ` · ${METODO_PAGO_LABELS[data.metodo_pago_adelanto]}` : ""}
          </p>
          {data.pagos.length > 0 ? (
            <div className="space-y-1">
              <p className="font-medium">Pagos de saldo</p>
              {data.pagos
                .filter((pago) => pago.tipo === "saldo")
                .map((pago) => (
                  <p key={pago.id} className="text-muted-foreground">
                    {formatBs(pago.monto)} · {METODO_PAGO_LABELS[pago.metodo]}
                    {pago.usuario_nombre ? ` · ${pago.usuario_nombre}` : ""} ·{" "}
                    {formatFechaHora(pago.created_at)}
                  </p>
                ))}
            </div>
          ) : data.pagos_saldo > 0 ? (
            <p>Pagos de saldo {formatBs(data.pagos_saldo)}</p>
          ) : null}
          <p className={data.saldo > 0 ? "text-accent font-semibold" : "text-success font-semibold"}>
            Saldo {formatBs(data.saldo)}
          </p>
          {data.notas ? <p className="pt-2">{data.notas}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.historial.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aún no hay cambios de estado.</p>
          ) : (
            data.historial.map((evento) => (
              <div key={evento.id} className="border-border/70 border-l-2 pl-3 text-sm">
                <p className="font-medium">
                  {evento.estado_anterior
                    ? `${ESTADO_LABELS[evento.estado_anterior]} → ${ESTADO_LABELS[evento.estado_nuevo]}`
                    : ESTADO_LABELS[evento.estado_nuevo]}
                </p>
                <p className="text-muted-foreground">
                  {evento.usuario_nombre ?? "Sistema"} · {formatFechaHora(evento.created_at)}
                </p>
                {evento.nota ? <p>{evento.nota}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 no-print">
        {puedeCobrar ? (
          <Button type="button" variant="accent" onClick={() => setCobroAbierto(true)}>
            Registrar cobro
          </Button>
        ) : null}
        {puedeRetroceder ? (
          <Button type="button" variant="outline" onClick={() => void retroceder()} disabled={cambiar.isPending}>
            Volver a {previo ? ESTADO_LABELS[previo] : ""}
          </Button>
        ) : null}
        {puedeCancelar ? (
          <Button type="button" variant="destructive" onClick={() => setCancelarAbierto(true)}>
            Cancelar pedido
          </Button>
        ) : null}
      </div>

      <CobroDialog pedido={data} open={cobroAbierto} onOpenChange={setCobroAbierto} />
      <CancelarDialog pedido={data} open={cancelarAbierto} onOpenChange={setCancelarAbierto} />
    </div>
  );
}
