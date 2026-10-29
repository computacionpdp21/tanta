import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCambiarEstado } from "@/hooks/use-pedidos";
import type { PedidoConTotales } from "@/types/database";

interface CancelarDialogProps {
  pedido: PedidoConTotales | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelarDialog({ pedido, open, onOpenChange }: CancelarDialogProps) {
  const cambiar = useCambiarEstado();
  const [motivo, setMotivo] = useState("");

  async function confirmar() {
    if (!pedido) return;
    const nota = motivo.trim();
    if (nota.length < 3) {
      toast.error("Escribe un motivo de al menos 3 letras");
      return;
    }
    try {
      await cambiar.mutateAsync({ id: pedido.id, estado: "cancelado", nota });
      toast.success("Pedido cancelado");
      setMotivo("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMotivo("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
          <DialogDescription>
            {pedido
              ? `Vas a cancelar ${pedido.numero_formateado} de ${pedido.cliente_nombre}. Esta acción queda en el historial.`
              : "Confirma la cancelación"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="motivo-cancelar">Motivo</Label>
          <Textarea
            id="motivo-cancelar"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Cliente no retira, error en el pedido…"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={cambiar.isPending}
          >
            {cambiar.isPending ? "Cancelando…" : "Sí, cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
