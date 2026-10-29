import { useNavigate } from "react-router-dom";
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
import { formatBs } from "@/lib/formatters";
import { generarTextoWhatsApp, pedidoParaWhatsApp } from "@/lib/whatsapp";
import type { PedidoConTotales, PedidoItem } from "@/types/database";

interface ExitoDialogProps {
  open: boolean;
  pedido: PedidoConTotales | null;
  items: PedidoItem[];
  onNuevo: () => void;
}

export function ExitoDialog({ open, pedido, items, onNuevo }: ExitoDialogProps) {
  const navigate = useNavigate();
  if (!pedido) return null;

  async function copiar() {
    if (!pedido) return;
    const texto = generarTextoWhatsApp(pedidoParaWhatsApp(pedido, items));
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Resumen copiado. Pégalo en WhatsApp.");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto a mano.");
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedido {pedido.numero_formateado} guardado</DialogTitle>
          <DialogDescription>
            Total {formatBs(pedido.total)} · Saldo {formatBs(pedido.saldo)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col">
          <Button type="button" onClick={() => void copiar()}>
            Copiar resumen para WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/pedidos/${pedido.id}`)}
          >
            Ver pedido
          </Button>
          <Button type="button" variant="secondary" onClick={onNuevo}>
            Nuevo pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
