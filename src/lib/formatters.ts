export function formatBs(value: number): string {
  const formatted = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `Bs ${formatted}`;
}

export function formatTelefonoBolivia(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (digits.startsWith("591") && digits.length >= 11) {
    return `+591 ${digits.slice(3, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 8) {
    return `+591 ${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
  }
  return telefono;
}

export function waMeUrl(telefono: string, texto?: string): string {
  const digits = telefono.replace(/\D/g, "");
  const withCountry = digits.startsWith("591") ? digits : `591${digits}`;
  const mensaje = texto?.trim();
  if (!mensaje) return `https://wa.me/${withCountry}`;
  return `https://api.whatsapp.com/send/?phone=${withCountry}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`;
}

export function telUrl(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  const withCountry = digits.startsWith("591") ? digits : `591${digits}`;
  return `tel:+${withCountry}`;
}

export function mapsUrl(direccion: string, referencia?: string | null): string {
  const ref = referencia?.trim() ?? "";
  if (/^https?:\/\//i.test(ref)) return ref;
  const query = [direccion, ref].filter((part) => part.length > 0).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
