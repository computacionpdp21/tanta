import { useEffect, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { ESTADO_LABELS, ESTADO_STYLES } from "@/lib/constants";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import type { PedidosFiltros } from "@/lib/pedidos-filtros";
import { cn } from "@/lib/utils";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/types/database";

interface PedidosFiltrosBarProps {
  filtros: PedidosFiltros;
  onChange: (filtros: PedidosFiltros) => void;
  conteos?: Partial<Record<EstadoPedido | "hoy" | "manana" | "pasado", number>>;
}

function Chip({
  active,
  onClick,
  children,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-medium transition-colors duration-200",
        active && !tone && "border-accent bg-accent text-accent-foreground shadow-sm",
        active && tone && cn("ring-2 ring-offset-1 ring-current", tone),
        !active && "border-border bg-background hover:bg-secondary",
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span className={cn("ml-1.5 text-[11px] font-bold tabular-nums", active && !tone ? "opacity-90" : "text-muted-foreground")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

type AtajoFecha = "hoy" | "manana" | "pasado" | "todas";

export function PedidosFiltrosBar({ filtros, onChange, conteos }: PedidosFiltrosBarProps) {
  const [busqueda, setBusqueda] = useState(filtros.q);

  useEffect(() => {
    setBusqueda(filtros.q);
  }, [filtros.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (busqueda !== filtros.q) onChange({ ...filtros, q: busqueda });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busqueda, filtros, onChange]);

  const hoy = toDateInputValue();
  const manana = fechaConOffset(1);
  const pasado = fechaConOffset(2);

  const atajo: AtajoFecha =
    filtros.desde === hoy && filtros.hasta === hoy
      ? "hoy"
      : filtros.desde === manana && filtros.hasta === manana
        ? "manana"
        : filtros.desde === pasado && filtros.hasta === pasado
          ? "pasado"
          : !filtros.desde && !filtros.hasta
            ? "todas"
            : "todas";

  function setAtajo(next: AtajoFecha) {
    if (next === "todas") {
      onChange({ ...filtros, desde: "", hasta: "" });
      return;
    }
    const fecha = next === "hoy" ? hoy : next === "manana" ? manana : pasado;
    onChange({ ...filtros, desde: fecha, hasta: fecha });
  }

  function toggleEstado(estado: EstadoPedido) {
    const selected = filtros.estados.includes(estado)
      ? filtros.estados.filter((item) => item !== estado)
      : [...filtros.estados, estado];
    onChange({ ...filtros, estados: selected });
  }

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Label htmlFor="buscar-pedido">Buscar</Label>
          <Input
            id="buscar-pedido"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre, teléfono o #014"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-72">
          <div className="grid gap-1.5">
            <Label htmlFor="desde">Desde</Label>
            <Input
              id="desde"
              type="date"
              value={filtros.desde}
              onChange={(event) => onChange({ ...filtros, desde: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hasta">Hasta</Label>
            <Input
              id="hasta"
              type="date"
              value={filtros.hasta}
              onChange={(event) => onChange({ ...filtros, hasta: event.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 lg:pb-1">
          <Switch
            id="mostrar-cancelados"
            checked={filtros.cancelados}
            onCheckedChange={(checked) => onChange({ ...filtros, cancelados: checked })}
          />
          <Label htmlFor="mostrar-cancelados" className="text-sm font-medium">
            Cancelados
          </Label>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Fecha</p>
          <Segmented
            aria-label="Fecha rápida"
            value={atajo}
            onChange={setAtajo}
            options={[
              { value: "hoy", label: "Hoy", count: conteos?.hoy },
              { value: "manana", label: "Mañana", count: conteos?.manana },
              { value: "pasado", label: "Pasado", count: conteos?.pasado },
              { value: "todas", label: "Todas" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Estado</p>
          <div className="flex flex-wrap gap-2">
            {ESTADOS_PEDIDO.filter((estado) => estado !== "cancelado").map((estado) => (
              <Chip
                key={estado}
                active={filtros.estados.includes(estado)}
                onClick={() => toggleEstado(estado)}
                count={conteos?.[estado]}
                tone={ESTADO_STYLES[estado].className}
              >
                <span className={cn("mr-1.5 inline-block size-1.5 rounded-full", ESTADO_STYLES[estado].dotClassName)} />
                {ESTADO_LABELS[estado]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
