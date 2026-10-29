import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border-0 px-2.5 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border bg-transparent text-foreground",
        success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
        warning: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
        info: "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200",
        destructive: "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
