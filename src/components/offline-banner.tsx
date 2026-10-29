import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function on() {
      setOnline(true);
    }
    function off() {
      setOnline(false);
    }
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 text-amber-950 no-print px-4 py-2 text-center text-sm font-medium dark:bg-amber-400/20 dark:text-amber-100"
    >
      Sin conexión: los pedidos se actualizarán al volver internet.
    </div>
  );
}
