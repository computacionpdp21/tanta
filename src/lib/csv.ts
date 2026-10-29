function escaparCsv(value: string | number | boolean | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function filasACsv(filas: Array<Array<string | number | boolean | null | undefined>>): string {
  return `\uFEFF${filas.map((fila) => fila.map(escaparCsv).join(";")).join("\r\n")}`;
}

export function descargarCsv(nombre: string, filas: Array<Array<string | number | boolean | null | undefined>>) {
  const blob = new Blob([filasACsv(filas)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
