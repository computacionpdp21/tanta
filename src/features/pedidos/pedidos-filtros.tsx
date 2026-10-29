import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ESTADO_LABELS, TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { fechaConOffset, toDateInputValue } from "@/lib/dates";
import type { PedidosFiltros } from "@/lib/pedidos-filtros";
import { cn } from "@/lib/utils";
import { ESTADOS_PEDIDO, type EstadoPedido, type TipoEntrega } from "@/types/database";

interface PedidosFiltrosBarProps {
  filtros: PedidosFiltros;
  onChange: (filtros: PedidosFiltros) => void;
}

export function PedidosFiltrosBar({ filtros, onChange }: PedidosFiltrosBarProps) {
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
    <div className="bg-card/80 space-y-4 rounded-2xl border p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="buscar-pedido">Buscar</Label>
          <Input
            id="buscar-pedido"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre, teléfono o #014"
          />
        </div>
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={filtros.desde === hoy && filtros.hasta === hoy ? "default" : "outline"}
          onClick={() => atajo(hoy)}
        >
          Hoy
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filtros.desde === manana && filtros.hasta === manana ? "default" : "outline"}
          onClick={() => atajo(manana)}
        >
          Mañana
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filtros.desde === pasado && filtros.hasta === pasado ? "default" : "outline"}
          onClick={() => atajo(pasado)}
        >
          Pasado
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange({ ...filtros, desde: "", hasta: "" })}
        >
          Todas las fechas
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ESTADOS_PEDIDO.filter((estado) => estado !== "cancelado").map((estado) => (
          <button
            key={estado}
            type="button"
            onClick={() => toggleEstado(estado)}
            className={cn(
              "min-h-11 rounded-full border px-3 text-sm font-medium",
              filtros.estados.includes(estado)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background",
            )}
          >
            {ESTADO_LABELS[estado]}
          </button>
        ))}
        {(Object.keys(TIPO_ENTREGA_LABELS) as TipoEntrega[]).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setTipo(tipo)}
            className={cn(
              "min-h-11 rounded-full border px-3 text-sm font-medium",
              filtros.tipo === tipo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background",
            )}
          >
            {TIPO_ENTREGA_LABELS[tipo]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="mostrar-cancelados" className="text-sm font-medium">
          Mostrar cancelados
        </Label>
        <Switch
          id="mostrar-cancelados"
          checked={filtros.cancelados}
          onCheckedChange={(checked) => onChange({ ...filtros, cancelados: checked })}
        />
      </div>
    </div>
  );
}
