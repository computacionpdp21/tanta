import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, Flame, Plus, Truck, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PedidoCard, PedidoRow } from "@/features/pedidos/pedido-card";
import { PedidosFiltrosBar } from "@/features/pedidos/pedidos-filtros";
import { useAuth } from "@/features/auth/auth-context";
import { useIsDesktop } from "@/hooks/use-media-query";
import { usePedidosInfinitos, usePedidosSeccion } from "@/hooks/use-pedidos";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import { formatBs } from "@/lib/formatters";
import {
  parseFiltros,
  serializarFiltros,
  type PedidosFiltros,
} from "@/lib/pedidos-filtros";
import { puede, ROLES_GESTIONAR_PEDIDOS } from "@/lib/permisos";
import type { EstadoPedido, PedidoConTotales, TipoEntrega } from "@/types/database";

function ListaPedidos({ pedidos }: { pedidos: PedidoConTotales[] }) {
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Nº</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Entrega</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Ítems</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium">Saldo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <PedidoRow key={pedido.id} pedido={pedido} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="fade-up-stagger grid gap-3">
      {pedidos.map((pedido) => (
        <PedidoCard key={pedido.id} pedido={pedido} />
      ))}
    </div>
  );
}

function Seccion({
  titulo,
  pedidos,
  cargando,
}: {
  titulo: string;
  pedidos: PedidoConTotales[] | undefined;
  cargando: boolean;
}) {
  if (cargando) {
    return (
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{titulo}</h2>
        <Skeleton className="h-28 w-full" />
      </section>
    );
  }
  if (!pedidos || pedidos.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{titulo}</h2>
      <ListaPedidos pedidos={pedidos} />
    </section>
  );
}

function Sentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} className="h-8" />;
}

function ResumenTarjetas({ pedidos }: { pedidos: PedidoConTotales[] }) {
  const hoy = toDateInputValue();
  const pedidosHoy = pedidos.filter(
    (pedido) => pedido.fecha_entrega === hoy && pedido.estado !== "cancelado",
  ).length;
  const porHornear = pedidos.filter(
    (pedido) => pedido.estado === "pendiente" || pedido.estado === "en_produccion",
  ).length;
  const entregasPendientes = pedidos.filter((pedido) => pedido.estado === "listo").length;
  const saldo = pedidos.reduce((sum, pedido) => sum + Math.max(pedido.saldo, 0), 0);

  const cards = [
    { label: "Pedidos de hoy", value: String(pedidosHoy), icon: ClipboardList },
    { label: "Por hornear", value: String(porHornear), icon: Flame },
    { label: "Entregas pendientes", value: String(entregasPendientes), icon: Truck },
    { label: "Saldo por cobrar", value: formatBs(saldo), icon: Wallet },
  ];

  return (
    <div className="fade-up-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="lift-card bg-card rounded-2xl border p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {card.label}
            </p>
            <span className="bg-secondary text-primary flex size-8 items-center justify-center rounded-xl">
              <card.icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="font-display mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
        </article>
      ))}
    </div>
  );
}

export function PedidosPage() {
  const { rol } = useAuth();
  const [params, setParams] = useSearchParams();
  const searchKey = params.toString();
  const filtros = useMemo(() => parseFiltros(new URLSearchParams(searchKey)), [searchKey]);
  const puedeCrear = puede(rol, ROLES_GESTIONAR_PEDIDOS);
  const conRango = Boolean(filtros.desde || filtros.hasta);
  const hoy = toDateInputValue();
  const manana = fechaConOffset(1);
  const pasado = fechaConOffset(2);

  const setFiltros = useCallback(
    (next: PedidosFiltros) => {
      setParams(serializarFiltros(next), { replace: true });
    },
    [setParams],
  );

  const atrasados = usePedidosSeccion(filtros, { fechaLt: hoy }, !conRango);
  const seccionHoy = usePedidosSeccion(filtros, { fechaEq: hoy }, !conRango);
  const seccionManana = usePedidosSeccion(filtros, { fechaEq: manana }, !conRango);
  const resto = usePedidosInfinitos(
    conRango ? filtros : { ...filtros, desde: fechaConOffset(2) },
    true,
  );

  const restoPedidos = useMemo(
    () => resto.data?.pages.flatMap((page) => page.rows) ?? [],
    [resto.data],
  );
  const pedidosCargados = useMemo(() => {
    if (conRango) return restoPedidos;
    return [
      ...(atrasados.data?.rows ?? []),
      ...(seccionHoy.data?.rows ?? []),
      ...(seccionManana.data?.rows ?? []),
      ...restoPedidos,
    ];
  }, [conRango, restoPedidos, atrasados.data?.rows, seccionHoy.data?.rows, seccionManana.data?.rows]);

  const haySecciones = pedidosCargados.length > 0;

  const cargandoInicial =
    (conRango ? resto.isLoading : atrasados.isLoading || seccionHoy.isLoading || resto.isLoading) &&
    !haySecciones;

  const conteos = useMemo(() => {
    const base: Partial<Record<EstadoPedido | TipoEntrega | "hoy" | "manana" | "pasado", number>> =
      {
        hoy: 0,
        manana: 0,
        pasado: 0,
        pendiente: 0,
        en_produccion: 0,
        listo: 0,
        entregado: 0,
        recojo: 0,
        envio: 0,
      };
    for (const pedido of pedidosCargados) {
      if (pedido.fecha_entrega === hoy) base.hoy = (base.hoy ?? 0) + 1;
      if (pedido.fecha_entrega === manana) base.manana = (base.manana ?? 0) + 1;
      if (pedido.fecha_entrega === pasado) base.pasado = (base.pasado ?? 0) + 1;
      base[pedido.estado] = (base[pedido.estado] ?? 0) + 1;
      base[pedido.tipo_entrega] = (base[pedido.tipo_entrega] ?? 0) + 1;
    }
    return base;
  }, [pedidosCargados, hoy, manana, pasado]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {puedeCrear ? (
          <Button asChild>
            <Link to="/pedidos/nuevo">
              <Plus className="size-4" />
              Nuevo pedido
            </Link>
          </Button>
        ) : null}
      </div>

      {cargandoInicial ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ResumenTarjetas pedidos={pedidosCargados} />
      )}

      <PedidosFiltrosBar filtros={filtros} onChange={setFiltros} conteos={conteos} />

      {cargandoInicial ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {!conRango ? (
        <>
          <Seccion titulo="Atrasados" pedidos={atrasados.data?.rows} cargando={atrasados.isLoading} />
          <Seccion titulo="Hoy" pedidos={seccionHoy.data?.rows} cargando={seccionHoy.isLoading} />
          <Seccion titulo="Mañana" pedidos={seccionManana.data?.rows} cargando={seccionManana.isLoading} />
          {restoPedidos.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Más adelante</h2>
              <ListaPedidos pedidos={restoPedidos} />
            </section>
          ) : null}
        </>
      ) : restoPedidos.length > 0 ? (
        <ListaPedidos pedidos={restoPedidos} />
      ) : null}

      {!cargandoInicial && !haySecciones ? (
        <EmptyState
          icon={ClipboardList}
          title="Todavía no hay pedidos para estas fechas 🥖"
          description="Prueba otra fecha, quita un estado o registra un pedido nuevo."
        >
          {puedeCrear ? (
            <Button asChild>
              <Link to="/pedidos/nuevo">Nuevo pedido</Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : null}

      {resto.hasNextPage ? (
        <Sentinel
          onVisible={() => {
            if (!resto.isFetchingNextPage) void resto.fetchNextPage();
          }}
        />
      ) : null}
    </div>
  );
}
