import { useEffect, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ESTADO_LABELS, ESTADO_STYLES, TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import type { PedidosFiltros } from "@/lib/pedidos-filtros";
import { cn } from "@/lib/utils";
import { ESTADOS_PEDIDO, type EstadoPedido, type TipoEntrega } from "@/types/database";

interface PedidosFiltrosBarProps {
  filtros: PedidosFiltros;
  onChange: (filtros: PedidosFiltros) => void;
  conteos?: Partial<Record<EstadoPedido | TipoEntrega | "hoy" | "manana" | "pasado", number>>;
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
        "min-h-11 rounded-full border px-3 text-sm font-medium transition-colors",
        active && !tone && "border-primary bg-primary text-primary-foreground shadow-sm",
        active && tone && cn("ring-2 ring-offset-1 ring-current", tone),
        !active && "border-border bg-background hover:bg-secondary",
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span className={cn("ml-1.5 text-[11px] font-bold", active && !tone ? "opacity-90" : "text-muted-foreground")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

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
  const todas = !filtros.desde && !filtros.hasta;

  function atajo(fecha: string) {
    onChange({ ...filtros, desde: fecha, hasta: fecha });
  }

  function toggleEstado(estado: EstadoPedido) {
    const selected = filtros.estados.includes(estado)
      ? filtros.estados.filter((item) => item !== estado)
      : [...filtros.estados, estado];
    onChange({ ...filtros, estados: selected });
  }

  function setTipo(tipo: TipoEntrega | "") {
    onChange({ ...filtros, tipo: filtros.tipo === tipo ? "" : tipo });
  }

  return (
    <div className="bg-card/90 space-y-3 rounded-2xl border p-3 shadow-sm">
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

      <div className="flex flex-wrap gap-2">
        <Chip active={filtros.desde === hoy && filtros.hasta === hoy} onClick={() => atajo(hoy)} count={conteos?.hoy}>
          Hoy
        </Chip>
        <Chip
          active={filtros.desde === manana && filtros.hasta === manana}
          onClick={() => atajo(manana)}
          count={conteos?.manana}
        >
          Mañana
        </Chip>
        <Chip
          active={filtros.desde === pasado && filtros.hasta === pasado}
          onClick={() => atajo(pasado)}
          count={conteos?.pasado}
        >
          Pasado
        </Chip>
        <Chip active={todas} onClick={() => onChange({ ...filtros, desde: "", hasta: "" })}>
          Todas
        </Chip>
        {ESTADOS_PEDIDO.filter((estado) => estado !== "cancelado").map((estado) => (
          <Chip
            key={estado}
            active={filtros.estados.includes(estado)}
            onClick={() => toggleEstado(estado)}
            count={conteos?.[estado]}
            tone={ESTADO_STYLES[estado].className}
          >
            {ESTADO_LABELS[estado]}
          </Chip>
        ))}
        {(Object.keys(TIPO_ENTREGA_LABELS) as TipoEntrega[]).map((tipo) => (
          <Chip
            key={tipo}
            active={filtros.tipo === tipo}
            onClick={() => setTipo(tipo)}
            count={conteos?.[tipo]}
          >
            {TIPO_ENTREGA_LABELS[tipo]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
