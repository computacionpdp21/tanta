import { useParams } from "react-router-dom";
import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PedidoForm } from "@/features/pedidos/pedido-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { usePedido } from "@/hooks/use-pedidos";
import { puedeEditarPedido } from "@/lib/estados";

export function NuevoPedidoPage() {
  const { id } = useParams();
  const { rol } = useAuth();
  const pedidoQuery = usePedido(id);

  if (!id) {
    return <PedidoForm />;
  }

  if (pedidoQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!pedidoQuery.data) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No encontramos ese pedido"
        description="Puede que lo hayan cancelado o que el enlace esté mal."
      />
    );
  }

  if (!puedeEditarPedido(rol, pedidoQuery.data.estado)) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Este pedido ya no se puede editar"
        description="Solo un administrador puede cambiar un pedido entregado o cancelado."
      />
    );
  }

  return <PedidoForm pedido={pedidoQuery.data} />;
}
