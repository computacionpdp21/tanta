import { useEffect } from "react";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

export function useWakeLock(activo: boolean) {
  useEffect(() => {
    if (!activo || typeof navigator === "undefined") return;

    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;

    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function pedir() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        lock = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void pedir();
      }
    }

    void pedir();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (lock && !lock.released) {
        void lock.release();
      }
    };
  }, [activo]);
}
