import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center shadow-sm",
        className,
      )}
    >
      <span className="bg-secondary text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
