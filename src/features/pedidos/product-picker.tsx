import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatBs } from "@/lib/formatters";
import type { Producto } from "@/types/database";

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Producto[];
  onSelect: (producto: Producto | null) => void;
}

export function ProductPicker({
  open,
  onOpenChange,
  productos,
  onSelect,
}: ProductPickerProps) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((producto) =>
      `${producto.nombre} ${producto.tamano}`.toLowerCase().includes(term),
    );
  }, [productos, query]);

  function choose(producto: Producto | null) {
    onSelect(producto);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>Elegir producto</SheetTitle>
          <SheetDescription>Busca en el catálogo o usa “Otro” si no está.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-3.5 left-3 size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tantawawa, caballito…"
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => choose(null)}>
            Otro (descripción libre)
          </Button>
          <div className="max-h-[50dvh] space-y-2 overflow-y-auto pb-2">
            {filtrados.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No hay productos con esa búsqueda.
              </p>
            ) : (
              filtrados.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => choose(producto)}
                  className="hover:bg-secondary flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left"
                >
                  <span>
                    <span className="block font-medium">
                      {producto.nombre} {producto.tamano}
                    </span>
                    <span className="text-muted-foreground text-sm">Precio base sugerido</span>
                  </span>
                  <span className="font-semibold">{formatBs(producto.precio_base)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
