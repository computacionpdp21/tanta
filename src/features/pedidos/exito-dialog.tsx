import { useNavigate } from "react-router-dom";
import { Copy, MessageCircle } from "lucide-react";
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
import { formatBs, waMeUrl } from "@/lib/formatters";
import { generarTextoWhatsApp, pedidoParaWhatsApp, prepararWhatsApp } from "@/lib/whatsapp";
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

  const texto = generarTextoWhatsApp(pedidoParaWhatsApp(pedido, items));
  const whatsappHref = waMeUrl(pedido.cliente_telefono, texto);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado. Ya lo puedes pegar donde quieras.");
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
        <p className="text-muted-foreground text-sm">
          Se abre el chat de {pedido.cliente_nombre} con el resumen listo para enviar.
        </p>
        <DialogFooter className="sm:flex-col">
          <Button asChild variant="whatsapp" size="lg" className="w-full">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => prepararWhatsApp(texto)}
            >
              <MessageCircle className="size-5" />
              Enviar por WhatsApp
            </a>
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => void copiar()}>
            <Copy className="size-4" />
            Copiar texto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/pedidos/${pedido.id}`)}
          >
            Ver pedido
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onNuevo}>
            Nuevo pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
