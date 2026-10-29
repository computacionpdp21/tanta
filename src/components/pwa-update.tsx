import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function PwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let activo = true;

    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (!activo) return;
        updateRef.current = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (activo) setNeedRefresh(true);
          },
        });
      })
      .catch(() => {
        /* Sin service worker no se interrumpe la app */
      });

    return () => {
      activo = false;
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="bg-primary text-primary-foreground no-print flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <p>Hay una actualización, toca para actualizar</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setNeedRefresh(false);
          void updateRef.current?.(true);
        }}
      >
        Actualizar
      </Button>
    </div>
  );
}
