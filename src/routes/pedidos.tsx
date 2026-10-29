import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, Flame, Plus, Truck, Wallet } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PedidoCard, PedidoRow } from "@/features/pedidos/pedido-card";
import { PedidosFiltrosBar } from "@/features/pedidos/pedidos-filtros";
import { useAuth } from "@/features/auth/auth-context";
import { useIsDesktop } from "@/hooks/use-media-query";
import { usePedidosInfinitos, usePedidosSeccion } from "@/hooks/use-pedidos";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import {
  parseFiltros,
  serializarFiltros,
  type PedidosFiltros,
} from "@/lib/pedidos-filtros";
import { puede, ROLES_GESTIONAR_PEDIDOS } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import type { EstadoPedido, PedidoConTotales } from "@/types/database";

function filtrarSaldo(pedidos: PedidoConTotales[] | undefined, soloSaldo: boolean) {
  if (!pedidos) return pedidos;
  if (!soloSaldo) return pedidos;
  return pedidos.filter((pedido) => pedido.saldo > 0);
}

function ListaPedidos({
  pedidos,
  highlights,
}: {
  pedidos: PedidoConTotales[];
  highlights: Set<string>;
}) {
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Nº · Cliente</th>
              <th className="px-3 py-2 font-medium">Entrega</th>
              <th className="px-3 py-2 font-medium">Ítems</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium">Saldo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <PedidoRow key={pedido.id} pedido={pedido} highlight={highlights.has(pedido.id)} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="fade-up-stagger grid gap-3">
      {pedidos.map((pedido) => (
        <PedidoCard key={pedido.id} pedido={pedido} highlight={highlights.has(pedido.id)} />
      ))}
    </div>
  );
}

function Seccion({
  titulo,
  pedidos,
  cargando,
  highlights,
}: {
  titulo: string;
  pedidos: PedidoConTotales[] | undefined;
  cargando: boolean;
  highlights: Set<string>;
}) {
  if (cargando) {
    return (
      <section className="space-y-3">
        <h2 className="sticky-group font-display text-lg font-semibold">{titulo}</h2>
        <Skeleton className="h-28 w-full" />
      </section>
    );
  }
  if (!pedidos || pedidos.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="sticky-group font-display text-lg font-semibold">
        {titulo} · {pedidos.length}
      </h2>
      <ListaPedidos pedidos={pedidos} highlights={highlights} />
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

function ResumenTarjetas({
  pedidos,
  onSelect,
}: {
  pedidos: PedidoConTotales[];
  onSelect: (kind: "hoy" | "hornear" | "entregas" | "saldo") => void;
}) {
  const hoy = toDateInputValue();
  const manana = fechaConOffset(1);
  const pedidosHoy = pedidos.filter(
    (pedido) => pedido.fecha_entrega === hoy && pedido.estado !== "cancelado",
  );
  const porHornear = pedidos.filter(
    (pedido) => pedido.estado === "pendiente" || pedido.estado === "en_produccion",
  );
  const entregasPendientes = pedidos.filter((pedido) => pedido.estado === "listo");
  const conSaldo = pedidos.filter((pedido) => pedido.saldo > 0);
  const saldo = conSaldo.reduce((sum, pedido) => sum + pedido.saldo, 0);
  const paraManana = pedidos.filter(
    (pedido) => pedido.fecha_entrega === manana && pedido.estado !== "cancelado",
  ).length;

  const cards = [
    {
      id: "hoy" as const,
      label: "Pedidos de hoy",
      value: pedidosHoy.length,
      hint: paraManana ? `${paraManana} para mañana` : "Solo el día de hoy",
      icon: ClipboardList,
      tint: "from-blue-500/20 to-blue-500/5 text-blue-800 dark:text-blue-200",
    },
    {
      id: "hornear" as const,
      label: "Por hornear",
      value: porHornear.length,
      hint: `${porHornear.filter((p) => p.estado === "pendiente").length} pendientes`,
      icon: Flame,
      tint: "from-amber-500/25 to-amber-500/5 text-amber-900 dark:text-amber-200",
    },
    {
      id: "entregas" as const,
      label: "Entregas pendientes",
      value: entregasPendientes.length,
      hint: entregasPendientes.length ? "Listos para salir" : "Nada por entregar",
      icon: Truck,
      tint: "from-emerald-500/20 to-emerald-500/5 text-emerald-900 dark:text-emerald-200",
    },
    {
      id: "saldo" as const,
      label: "Saldo por cobrar",
      value: saldo,
      money: true,
      hint: conSaldo.length ? `${conSaldo.length} con saldo` : "Nada por cobrar",
      icon: Wallet,
      tint: "from-orange-500/20 to-orange-500/5 text-orange-900 dark:text-orange-200",
    },
  ];

  return (
    <div className="fade-up-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onSelect(card.id)}
          className="lift-card bg-card rounded-2xl border p-4 text-left shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {card.label}
            </p>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-xl bg-gradient-to-br",
                card.tint,
              )}
            >
              <card.icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
            {card.money ? <CountUp value={card.value} money /> : <CountUp value={card.value} />}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{card.hint}</p>
        </button>
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
  const [soloSaldo, setSoloSaldo] = useState(false);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);

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

  useEffect(() => {
    const ids = pedidosCargados.map((pedido) => pedido.id);
    if (!primed.current) {
      if (ids.length === 0) return;
      seenIds.current = new Set(ids);
      primed.current = true;
      return;
    }
    const nuevos = ids.filter((id) => !seenIds.current.has(id));
    seenIds.current = new Set(ids);
    if (nuevos.length === 0) return;
    setHighlights(new Set(nuevos));
    const timer = window.setTimeout(() => setHighlights(new Set()), 2000);
    return () => window.clearTimeout(timer);
  }, [pedidosCargados]);

  const hayDatos = (filtrarSaldo(pedidosCargados, soloSaldo) ?? []).length > 0;

  const cargandoInicial =
    (conRango ? resto.isLoading : atrasados.isLoading || seccionHoy.isLoading || resto.isLoading) &&
    !hayDatos;

  const conteos = useMemo(() => {
    const base: Partial<Record<EstadoPedido | "hoy" | "manana" | "pasado", number>> = {
      hoy: 0,
      manana: 0,
      pasado: 0,
      pendiente: 0,
      en_produccion: 0,
      listo: 0,
      entregado: 0,
    };
    for (const pedido of pedidosCargados) {
      if (pedido.fecha_entrega === hoy) base.hoy = (base.hoy ?? 0) + 1;
      if (pedido.fecha_entrega === manana) base.manana = (base.manana ?? 0) + 1;
      if (pedido.fecha_entrega === pasado) base.pasado = (base.pasado ?? 0) + 1;
      base[pedido.estado] = (base[pedido.estado] ?? 0) + 1;
    }
    return base;
  }, [pedidosCargados, hoy, manana, pasado]);

  function onKpi(kind: "hoy" | "hornear" | "entregas" | "saldo") {
    if (kind === "hoy") {
      setSoloSaldo(false);
      setFiltros({ ...filtros, desde: hoy, hasta: hoy, estados: [] });
      return;
    }
    if (kind === "hornear") {
      setSoloSaldo(false);
      setFiltros({ ...filtros, desde: "", hasta: "", estados: ["pendiente", "en_produccion"] });
      return;
    }
    if (kind === "entregas") {
      setSoloSaldo(false);
      setFiltros({ ...filtros, desde: "", hasta: "", estados: ["listo"] });
      return;
    }
    setFiltros({ ...filtros, desde: "", hasta: "", estados: [] });
    setSoloSaldo(true);
  }

  const atrasadosRows = filtrarSaldo(atrasados.data?.rows, soloSaldo);
  const hoyRows = filtrarSaldo(seccionHoy.data?.rows, soloSaldo);
  const mananaRows = filtrarSaldo(seccionManana.data?.rows, soloSaldo);
  const restoRows = filtrarSaldo(restoPedidos, soloSaldo) ?? [];

  return (
    <div className="space-y-5">
      {cargandoInicial ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ResumenTarjetas pedidos={pedidosCargados} onSelect={onKpi} />
      )}

      {soloSaldo ? (
        <p className="text-muted-foreground text-sm">
          Mostrando solo pedidos con saldo.{" "}
          <button type="button" className="text-primary font-semibold underline" onClick={() => setSoloSaldo(false)}>
            Quitar filtro
          </button>
        </p>
      ) : null}

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
          <Seccion titulo="Atrasados" pedidos={atrasadosRows} cargando={atrasados.isLoading} highlights={highlights} />
          <Seccion titulo="Hoy" pedidos={hoyRows} cargando={seccionHoy.isLoading} highlights={highlights} />
          <Seccion titulo="Mañana" pedidos={mananaRows} cargando={seccionManana.isLoading} highlights={highlights} />
          {restoRows.length > 0 ? (
            <section className="space-y-3">
              <h2 className="sticky-group font-display text-lg font-semibold">
                Más adelante · {restoRows.length}
              </h2>
              <ListaPedidos pedidos={restoRows} highlights={highlights} />
            </section>
          ) : null}
        </>
      ) : restoRows.length > 0 ? (
        <ListaPedidos pedidos={restoRows} highlights={highlights} />
      ) : null}

      {!cargandoInicial && !hayDatos ? (
        <EmptyState
          icon={ClipboardList}
          title="Todavía no hay pedidos para estas fechas 🥖"
          description="Prueba otra fecha, quita un estado o registra un pedido nuevo."
        >
          {puedeCrear ? (
            <Button asChild>
              <Link to="/pedidos/nuevo">
                <Plus className="size-4" />
                Nuevo pedido
              </Link>
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
