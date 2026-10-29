import { useEffect, useState } from "react";
import { formatBs } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function CountUp({
  value,
  money = false,
  className,
}: {
  value: number;
  money?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }
    const from = shown;
    const start = performance.now();
    const duration = 420;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * progress;
      setShown(money ? next : Math.round(next));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last displayed value
  }, [value, money]);

  return (
    <span className={cn("tabular-nums", className)}>
      {money ? formatBs(shown) : shown}
    </span>
  );
}
