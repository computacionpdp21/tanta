import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
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
import type { PedidoConTotales } from "@/types/database";

function ListaPedidos({ pedidos }: { pedidos: PedidoConTotales[] }) {
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <div className="overflow-x-auto rounded-2xl border">
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
    <div className="grid gap-3">
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

export function PedidosPage() {
  const { rol } = useAuth();
  const [params, setParams] = useSearchParams();
  const searchKey = params.toString();
  const filtros = useMemo(() => parseFiltros(new URLSearchParams(searchKey)), [searchKey]);
  const puedeCrear = puede(rol, ROLES_GESTIONAR_PEDIDOS);
  const conRango = Boolean(filtros.desde || filtros.hasta);
  const hoy = toDateInputValue();
  const manana = fechaConOffset(1);

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

  const restoPedidos = resto.data?.pages.flatMap((page) => page.rows) ?? [];
  const haySecciones =
    (atrasados.data?.rows.length ?? 0) +
      (seccionHoy.data?.rows.length ?? 0) +
      (seccionManana.data?.rows.length ?? 0) +
      restoPedidos.length >
    0;

  const cargandoInicial =
    (conRango ? resto.isLoading : atrasados.isLoading || seccionHoy.isLoading || resto.isLoading) &&
    !haySecciones;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {conRango ? "Filtrado por fecha de entrega." : "Hoy y mañana arriba; lo atrasado en rojo."}
        </p>
        {puedeCrear ? (
          <Button asChild>
            <Link to="/pedidos/nuevo">
              <Plus className="size-4" />
              Nuevo pedido
            </Link>
          </Button>
        ) : null}
      </div>

      <PedidosFiltrosBar filtros={filtros} onChange={setFiltros} />

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
          title="No hay pedidos con estos filtros"
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
