const LOCAL_RE = /^[67]\d{7}$/;

export function normalizarTelefonoBO(valor: string): string | null {
  const digits = valor.replace(/\D/g, "");
  const local = digits.startsWith("591") ? digits.slice(3) : digits;
  if (!LOCAL_RE.test(local)) return null;
  return `591${local}`;
}

export function telefonoLocal(valor: string): string {
  const digits = valor.replace(/\D/g, "");
  if (digits.startsWith("591") && digits.length >= 11) {
    return digits.slice(3, 11);
  }
  return digits.slice(0, 8);
}
