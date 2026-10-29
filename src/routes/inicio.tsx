import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  ChefHat,
  ClipboardList,
  Flame,
  MessageCircle,
  Plus,
  Truck,
  Wallet,
  Wheat,
} from "lucide-react";
import { CountUp } from "@/components/count-up";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { usePedidosSeccion } from "@/hooks/use-pedidos";
import { consolidarProduccion, useProduccionPorFecha } from "@/hooks/use-produccion";
import { useReporte } from "@/hooks/use-reporte";
import { FILTROS_VACIOS } from "@/lib/pedidos-filtros";
import { formatFechaLarga, formatHora, nowInLaPaz, toDateInputValue, fechaConOffset, esAtrasado } from "@/lib/dates";
import { waMeUrl } from "@/lib/formatters";
import { generarTextoWhatsApp, prepararWhatsApp } from "@/lib/whatsapp";
import {
  puede,
  ROLES_CATALOGO,
  ROLES_ENTREGAS,
  ROLES_GESTIONAR_PEDIDOS,
  ROLES_PRODUCCION,
  ROLES_RESUMEN,
  ROLES_VER_PEDIDOS,
} from "@/lib/permisos";
import { rangoDePeriodo } from "@/lib/periodos";

function saludoHora(nombre: string): string {
  const hour = nowInLaPaz().getHours();
  const base = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  return `${base}, ${nombre} 👋`;
}

function WheatDecor() {
  return (
    <svg viewBox="0 0 220 40" className="text-accent/25 h-8 w-40" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 32c8-10 16-10 24 0-8 4-16 4-24 0Zm24-2c8-10 16-10 24 0-8 4-16 4-24 0Zm24-1c8-10 16-10 24 0-8 4-16 4-24 0Zm24-1c8-10 16-10 24 0-8 4-16 4-24 0Zm24 1c8-10 16-10 24 0-8 4-16 4-24 0Zm24 2c8-10 16-10 24 0-8 4-16 4-24 0ZM20 36h160v2H20z"
      />
    </svg>
  );
}

function MiniBars({ dias }: { dias: Array<{ fecha: string; pedidos: number }> }) {
  const max = Math.max(1, ...dias.map((d) => d.pedidos));
  return (
    <div className="flex h-24 items-end gap-1.5">
      {dias.map((dia) => (
        <div key={dia.fecha} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="bg-accent/80 w-full rounded-t-md"
            style={{ height: `${Math.max(8, (dia.pedidos / max) * 100)}%` }}
            title={`${dia.fecha}: ${dia.pedidos}`}
          />
          <span className="text-muted-foreground text-[10px] uppercase">
            {dia.fecha.slice(8)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function InicioPage() {
  const { perfil, rol } = useAuth();
  const hoy = toDateInputValue();
  const manana = fechaConOffset(1);
  const semana = rangoDePeriodo("semana");
  const esAdmin = puede(rol, ROLES_RESUMEN);
  const puedeVerPedidos = puede(rol, ROLES_VER_PEDIDOS);
  const puedeCrear = puede(rol, ROLES_GESTIONAR_PEDIDOS);

  const atrasados = usePedidosSeccion(FILTROS_VACIOS, { fechaLt: hoy }, puedeVerPedidos);
  const seccionHoy = usePedidosSeccion(FILTROS_VACIOS, { fechaEq: hoy }, puedeVerPedidos);
  const seccionManana = usePedidosSeccion(FILTROS_VACIOS, { fechaEq: manana }, puedeVerPedidos);
  const produccion = useProduccionPorFecha(hoy);
  const reporte = useReporte(esAdmin ? semana.desde : "", esAdmin ? semana.hasta : "");

  const pedidosHoy = seccionHoy.data?.rows ?? [];
  const pedidosManana = seccionManana.data?.rows ?? [];
  const pedidosAtrasados = atrasados.data?.rows ?? [];
  const cargando = seccionHoy.isLoading || seccionManana.isLoading || atrasados.isLoading;

  const porHornear = [...pedidosHoy, ...pedidosManana].filter(
    (pedido) => pedido.estado === "pendiente" || pedido.estado === "en_produccion",
  );
  const entregasPendientes = [...pedidosHoy, ...pedidosManana].filter((pedido) => pedido.estado === "listo");
  const conSaldo = [...pedidosAtrasados, ...pedidosHoy, ...pedidosManana].filter((pedido) => pedido.saldo > 0);
  const saldo = conSaldo.reduce((sum, pedido) => sum + pedido.saldo, 0);

  const proximas = [...pedidosHoy, ...pedidosManana]
    .filter((pedido) => pedido.estado !== "cancelado" && pedido.estado !== "entregado")
    .sort((a, b) => `${a.fecha_entrega}${a.hora_entrega}`.localeCompare(`${b.fecha_entrega}${b.hora_entrega}`))
    .slice(0, 5);

  const atencionAtrasados = pedidosAtrasados.filter((pedido) => esAtrasado(pedido.fecha_entrega, pedido.estado));
  const atencionSaldo = conSaldo.filter((pedido) => pedido.estado === "entregado");
  const atencionPendiente = pedidosHoy.filter((pedido) => pedido.estado === "pendiente");
  const hayAtencion = atencionAtrasados.length + atencionSaldo.length + atencionPendiente.length > 0;

  const consolidado = consolidarProduccion(produccion.data?.items ?? []);
  const maxProd = Math.max(1, ...consolidado.grupos.map((g) => g.total), ...consolidado.otros.map((o) => o.cantidad));

  const accesos = [
    puedeCrear
      ? { to: "/pedidos/nuevo", label: "Nuevo pedido", icon: Plus }
      : null,
    puede(rol, ROLES_PRODUCCION) ? { to: "/produccion", label: "Producción", icon: ChefHat } : null,
    puede(rol, ROLES_ENTREGAS) ? { to: "/entregas", label: "Entregas", icon: Truck } : null,
    puede(rol, ROLES_CATALOGO) ? { to: "/productos", label: "Catálogo", icon: Wheat } : null,
    esAdmin ? { to: "/resumen", label: "Resumen", icon: BarChart3 } : null,
  ].filter(Boolean) as Array<{ to: string; label: string; icon: typeof Plus }>;

  return (
    <div className="space-y-5">
      <section className="hero-shift relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4B2E1A] to-[#7A4A21] p-5 text-[#F6ECDA] shadow-warm md:p-7">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="" width={88} height={88} className="size-16 rounded-full bg-[#f3e6cf] ring-2 ring-white/70 md:size-[88px]" />
            <div>
              <p className="font-display text-xl font-semibold md:text-2xl">
                {saludoHora(perfil?.nombre?.split(" ")[0] || "equipo")}
              </p>
              <p className="text-sm text-white/75 capitalize">{formatFechaLarga(hoy)}</p>
              <p className="font-display mt-1 text-lg italic text-[#E8AA4C]">Del horno a tu corazón</p>
              <WheatDecor />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeCrear ? (
              <Button asChild variant="accent">
                <Link to="/pedidos/nuevo">
                  <Plus className="size-4" />
                  Nuevo pedido
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="border-white/40 bg-transparent text-[#F6ECDA] hover:bg-white/10">
              <Link to="/pedidos">Ver pedidos</Link>
            </Button>
          </div>
        </div>
      </section>

      {cargando ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="fade-up-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Pedidos de hoy" value={pedidosHoy.length} icon={ClipboardList} />
          <Kpi label="Por hornear" value={porHornear.length} icon={Flame} />
          <Kpi label="Entregas pendientes" value={entregasPendientes.length} icon={Truck} />
          <Kpi label="Saldo por cobrar" value={saldo} money icon={Wallet} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
          <h2 className="font-display mb-3 text-lg font-semibold">Próximas entregas</h2>
          {proximas.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay entregas cercanas ✨</p>
          ) : (
            <ul className="space-y-2">
              {proximas.map((pedido) => (
                <li key={pedido.id} className="flex items-center justify-between gap-2">
                  <Link to={`/pedidos/${pedido.id}`} className="min-w-0">
                    <p className="truncate font-medium">
                      <span className="tabular-nums">{formatHora(pedido.hora_entrega)}</span> · {pedido.cliente_nombre}
                    </p>
                    <EstadoBadge estado={pedido.estado} saldo={pedido.saldo} />
                  </Link>
                  <Button asChild variant="whatsapp" size="icon-sm">
                    <a
                      href={waMeUrl(pedido.cliente_telefono, generarTextoWhatsApp(pedido))}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp"
                      onClick={() => prepararWhatsApp(generarTextoWhatsApp(pedido))}
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
          <h2 className="font-display mb-3 text-lg font-semibold">Producción de hoy</h2>
          {produccion.isLoading ? (
            <Skeleton className="h-24" />
          ) : consolidado.totalUnidades === 0 ? (
            <p className="text-muted-foreground text-sm">Nada por hornear hoy.</p>
          ) : (
            <ul className="space-y-2">
              {consolidado.grupos.map((grupo) => (
                <li key={grupo.nombre}>
                  <div className="flex justify-between text-sm">
                    <span>{grupo.nombre}</span>
                    <span className="tabular-nums font-semibold">{grupo.total}</span>
                  </div>
                  <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${Math.round((grupo.total / maxProd) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
          <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-4 text-destructive" />
            Atención
          </h2>
          {!hayAtencion ? (
            <p className="text-muted-foreground text-sm">Todo al día ✨</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {atencionAtrasados.length > 0 ? (
                <li className="text-destructive font-medium">{atencionAtrasados.length} atrasado(s)</li>
              ) : null}
              {atencionSaldo.length > 0 ? (
                <li className="text-orange-700 dark:text-orange-300">
                  {atencionSaldo.length} entregado(s) con saldo
                </li>
              ) : null}
              {atencionPendiente.length > 0 ? (
                <li>{atencionPendiente.length} pendiente(s) de confirmar</li>
              ) : null}
            </ul>
          )}
        </article>

        <article className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
          <h2 className="font-display mb-3 text-lg font-semibold">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-2">
            {accesos.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="bg-secondary hover:border-accent flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center text-sm font-semibold"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </article>

        {esAdmin ? (
          <article className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
            <h2 className="font-display mb-3 text-lg font-semibold">Esta semana</h2>
            {reporte.isLoading ? (
              <Skeleton className="h-24" />
            ) : reporte.data?.por_dia.length ? (
              <MiniBars dias={reporte.data.por_dia} />
            ) : (
              <p className="text-muted-foreground text-sm">Aún no hay movimiento esta semana.</p>
            )}
          </article>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  money,
  icon: Icon,
}: {
  label: string;
  value: number;
  money?: boolean;
  icon: typeof Wallet;
}) {
  return (
    <div className="lift-card bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
        <Icon className="text-accent size-4" />
      </div>
      <p className="font-display mt-2 text-2xl font-semibold">
        {money ? <CountUp value={value} money /> : <CountUp value={value} />}
      </p>
    </div>
  );
}
