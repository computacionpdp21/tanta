const silenciados = new Map<string, number>();

export function silenciarRealtime(pedidoId: string, ms = 5000) {
  const token = Date.now();
  silenciados.set(pedidoId, token);
  window.setTimeout(() => {
    if (silenciados.get(pedidoId) === token) {
      silenciados.delete(pedidoId);
    }
  }, ms);
}

export function estaSilenciado(pedidoId: string): boolean {
  return silenciados.has(pedidoId);
}
