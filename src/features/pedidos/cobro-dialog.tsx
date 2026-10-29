import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistrarPago } from "@/hooks/use-pedidos";
import { METODO_PAGO_LABELS } from "@/lib/constants";
import { formatBs } from "@/lib/formatters";
import type { MetodoPago, PedidoConTotales } from "@/types/database";

const METODOS: MetodoPago[] = ["efectivo", "qr", "transferencia"];

interface CobroDialogProps {
  pedido: PedidoConTotales | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CobroDialog({ pedido, open, onOpenChange }: CobroDialogProps) {
  const registrar = useRegistrarPago();
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");

  useEffect(() => {
    if (pedido && open) {
      setMonto(pedido.saldo > 0 ? pedido.saldo.toFixed(2) : "");
      setMetodo(pedido.metodo_pago_saldo ?? "efectivo");
    }
  }, [pedido, open]);

  async function confirmar() {
    if (!pedido) return;
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    try {
      await registrar.mutateAsync({ id: pedido.id, monto: valor, metodo });
      toast.success("Cobro registrado");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el cobro");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            {pedido
              ? `${pedido.numero_formateado} · saldo ${formatBs(pedido.saldo)}`
              : "Saldo del pedido"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cobro-monto">Monto (Bs)</Label>
            <Input
              id="cobro-monto"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Método</Label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={metodo === item ? "default" : "outline"}
                  onClick={() => setMetodo(item)}
                >
                  {METODO_PAGO_LABELS[item]}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void confirmar()} disabled={registrar.isPending}>
            {registrar.isPending ? "Guardando…" : "Registrar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
