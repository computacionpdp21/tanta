import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { EstadoBadge } from "@/components/estado-badge";
import { PrintMeta } from "@/components/print-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraficoEstados,
  GraficoPedidosDia,
  GraficoProductos,
  GraficoTipos,
  GraficoVentasDia,
} from "@/features/reportes/graficos";
import { exportarReporte, useReporte } from "@/hooks/use-reporte";
import { descargarCsv } from "@/lib/csv";
import { formatFecha, formatHora, toDateInputValue } from "@/lib/dates";
import { formatBs, waMeUrl } from "@/lib/formatters";
import { prepararWhatsApp } from "@/lib/whatsapp";
import { rangoDePeriodo, type TipoPeriodo } from "@/lib/periodos";

const PERIODOS: Array<{ id: TipoPeriodo; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "temporada", label: "Temporada" },
  { id: "rango", label: "Rango" },
];

function TarjetaKpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p className="font-display mt-1 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

export function ReportesPage() {
  const [tipo, setTipo] = useState<TipoPeriodo>("hoy");
  const [temporadaDesde, setTemporadaDesde] = useState(toDateInputValue());
  const [rangoDesde, setRangoDesde] = useState(toDateInputValue());
  const [rangoHasta, setRangoHasta] = useState(toDateInputValue());
  const [exportando, setExportando] = useState(false);

  const rango = useMemo(
    () => rangoDePeriodo(tipo, { temporadaDesde, rangoDesde, rangoHasta }),
    [tipo, temporadaDesde, rangoDesde, rangoHasta],
  );

  const { data, isLoading, error } = useReporte(rango.desde, rango.hasta);

  async function exportar() {
    setExportando(true);
    try {
      const [pedidos, items, pagos] = await Promise.all([
        exportarReporte("pedidos", rango.desde, rango.hasta),
        exportarReporte("items", rango.desde, rango.hasta),
        exportarReporte("pagos", rango.desde, rango.hasta),
      ]);
      const stamp = `${rango.desde}_${rango.hasta}`;
      descargarCsv(`pedidos_${stamp}.csv`, [
        [
          "Número",
          "Cliente",
          "Teléfono",
          "Tipo",
          "Fecha",
          "Hora",
          "Estado",
          "Total",
          "Adelanto",
          "Pagos saldo",
          "Saldo",
        ],
        ...pedidos.map((row) => [
          String(row.numero_formateado ?? ""),
          String(row.cliente_nombre ?? ""),
          String(row.cliente_telefono ?? ""),
          String(row.tipo_entrega ?? ""),
          String(row.fecha_entrega ?? ""),
          String(row.hora_entrega ?? ""),
          String(row.estado ?? ""),
          String(row.total ?? ""),
          String(row.adelanto ?? ""),
          String(row.pagos_saldo ?? ""),
          String(row.saldo ?? ""),
        ]),
      ]);
      descargarCsv(`items_${stamp}.csv`, [
        ["Pedido", "Fecha", "Descripción", "Cantidad", "Precio", "Subtotal", "Notas"],
        ...items.map((row) => [
          String(row.numero_formateado ?? ""),
          String(row.fecha_entrega ?? ""),
          String(row.descripcion ?? ""),
          String(row.cantidad ?? ""),
          String(row.precio_unitario ?? ""),
          String(row.subtotal ?? ""),
          String(row.notas_item ?? ""),
        ]),
      ]);
      descargarCsv(`pagos_${stamp}.csv`, [
        ["Pedido", "Fecha entrega", "Tipo", "Método", "Monto", "Registrado"],
        ...pagos.map((row) => [
          String(row.numero_formateado ?? ""),
          String(row.fecha_entrega ?? ""),
          String(row.tipo ?? ""),
          String(row.metodo ?? ""),
          String(row.monto ?? ""),
          String(row.created_at ?? ""),
        ]),
      ]);
      toast.success("Se descargaron 3 CSV (pedidos, ítems y pagos).");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "No se pudo exportar");
    } finally {
      setExportando(false);
    }
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-5 print-resumen">
      <PrintMeta titulo={`Resumen ${rango.desde} a ${rango.hasta}`} />

      <div className="no-print flex flex-wrap gap-2">
        {PERIODOS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tipo === item.id ? "default" : "outline"}
            onClick={() => setTipo(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <Button type="button" variant="outline" onClick={() => void exportar()} disabled={exportando}>
          <Download className="size-4" />
          {exportando ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      {tipo === "temporada" ? (
        <div className="no-print grid max-w-xs gap-1.5">
          <Label htmlFor="temporada-desde">Desde (inicio de temporada)</Label>
          <Input
            id="temporada-desde"
            type="date"
            value={temporadaDesde}
            onChange={(event) => setTemporadaDesde(event.target.value)}
          />
        </div>
      ) : null}

      {tipo === "rango" ? (
        <div className="no-print grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rango-desde">Desde</Label>
            <Input
              id="rango-desde"
              type="date"
              value={rangoDesde}
              onChange={(event) => setRangoDesde(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rango-hasta">Hasta</Label>
            <Input
              id="rango-hasta"
              type="date"
              value={rangoHasta}
              onChange={(event) => setRangoHasta(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {formatFecha(rango.desde, "d MMM yyyy")} — {formatFecha(rango.hasta, "d MMM yyyy")}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : null}

      {error ? (
        <EmptyState
          icon={BarChart3}
          title="No se pudo cargar el resumen"
          description={error instanceof Error ? error.message : "Inténtalo de nuevo."}
        />
      ) : null}

      {kpis ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TarjetaKpi titulo="Pedidos" valor={String(kpis.pedidos)} />
          <TarjetaKpi titulo="Unidades" valor={String(kpis.unidades)} />
          <TarjetaKpi titulo="Ventas" valor={formatBs(kpis.ventas)} />
          <TarjetaKpi titulo="Adelantos" valor={formatBs(kpis.adelantos)} />
          <TarjetaKpi titulo="Cobros de saldo" valor={formatBs(kpis.cobros)} />
          <TarjetaKpi titulo="Por cobrar" valor={formatBs(kpis.saldo)} />
          <TarjetaKpi titulo="Ticket promedio" valor={formatBs(kpis.ticket)} />
          <TarjetaKpi titulo="Cancelados" valor={String(kpis.cancelados)} />
        </div>
      ) : null}

      {data && data.kpis.pedidos === 0 && data.kpis.cancelados === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No hay pedidos en este periodo"
          description="Prueba otra fecha o espera a que ventas registre pedidos."
        />
      ) : null}

      {data && (data.por_dia.length > 0 || data.productos.length > 0) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="print-card">
            <CardHeader>
              <CardTitle>Pedidos y unidades por día</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoPedidosDia datos={data.por_dia} />
            </CardContent>
          </Card>
          <Card className="print-card">
            <CardHeader>
              <CardTitle>Ventas por día</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoVentasDia datos={data.por_dia} />
            </CardContent>
          </Card>
          <Card className="print-card">
            <CardHeader>
              <CardTitle>Recojo vs envío</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoTipos datos={data.por_tipo} />
            </CardContent>
          </Card>
          <Card className="print-card">
            <CardHeader>
              <CardTitle>Por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoEstados datos={data.por_estado} />
            </CardContent>
          </Card>
          <Card className="print-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoProductos datos={data.productos} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {data && data.por_cobrar.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Por cobrar</h2>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Entrega</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 no-print" />
                </tr>
              </thead>
              <tbody>
                {data.por_cobrar.map((pedido) => (
                  <tr key={pedido.id} className="border-b last:border-0">
                    <td className="px-3 py-3">
                      <Link to={`/pedidos/${pedido.id}`} className="font-semibold hover:underline">
                        {pedido.numero_formateado}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{pedido.cliente_nombre}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatFecha(pedido.fecha_entrega, "d MMM")} {formatHora(pedido.hora_entrega)}
                    </td>
                    <td className="px-3 py-3">
                      <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
                    </td>
                    <td className="text-accent px-3 py-3 text-right font-semibold">
                      {formatBs(pedido.saldo)}
                    </td>
                    <td className="px-3 py-3 no-print">
                      <Button asChild variant="whatsapp" size="sm">
                        <a
                          href={waMeUrl(
                            pedido.cliente_telefono,
                            `🥖 *Panadería Janeth* – Pedido ${pedido.numero_formateado}\nSaldo a cobrar: ${formatBs(pedido.saldo)}`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            prepararWhatsApp(
                              `🥖 *Panadería Janeth* – Pedido ${pedido.numero_formateado}\nSaldo a cobrar: ${formatBs(pedido.saldo)}`,
                            )
                          }
                        >
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
