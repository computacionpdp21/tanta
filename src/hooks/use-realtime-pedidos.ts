import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { ESTADO_LABELS } from "@/lib/constants";
import { asRecord } from "@/lib/mappers";
import { estaSilenciado } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import type { EstadoPedido } from "@/types/database";

export type EstadoRealtime = "en_vivo" | "reconectando" | "desconectado";

function invalidarPedidos(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
  void queryClient.invalidateQueries({ queryKey: ["produccion"] });
  void queryClient.invalidateQueries({ queryKey: ["entregas"] });
}

function etiquetaEstado(value: unknown): string {
  const estado = value as EstadoPedido;
  return ESTADO_LABELS[estado] ?? String(value ?? "");
}

export function useRealtimePedidos(): EstadoRealtime {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoRealtime>("reconectando");

  useEffect(() => {
    if (!supabase || !user) {
      setEstado("desconectado");
      return;
    }

    const client = supabase;
    let cancelled = false;
    let debounceTimer: number | undefined;

    function invalidarDebounced() {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        if (!cancelled) invalidarPedidos(queryClient);
      }, 300);
    }

    const channel = client
      .channel("janeth-pedidos-vivo")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        (payload) => {
          invalidarDebounced();
          const row = asRecord(payload.new);
          if (!row) return;
          const id = typeof row.id === "string" ? row.id : "";
          if (!id || estaSilenciado(id)) return;

          if (payload.eventType === "INSERT") {
            if (row.creado_por === user.id) return;
            const numero = typeof row.numero_formateado === "string" ? row.numero_formateado : "";
            const cliente = typeof row.cliente_nombre === "string" ? row.cliente_nombre : "un cliente";
            toast(`Nuevo pedido ${numero} de ${cliente}`);
            return;
          }

          if (payload.eventType === "UPDATE") {
            const prev = asRecord(payload.old);
            if (prev && prev.estado !== row.estado) {
              const numero = typeof row.numero_formateado === "string" ? row.numero_formateado : "";
              toast(`${numero} ahora está ${etiquetaEstado(row.estado)}`);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_items" },
        () => {
          invalidarDebounced();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_historial" },
        () => {
          invalidarDebounced();
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setEstado("en_vivo");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setEstado("reconectando");
        }
      });

    function onOnline() {
      setEstado("reconectando");
      invalidarDebounced();
    }

    function onOffline() {
      setEstado("reconectando");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void client.removeChannel(channel);
    };
  }, [queryClient, user]);

  return estado;
}
