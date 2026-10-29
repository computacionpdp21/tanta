import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "placeholder:text-muted-foreground border-input w-full min-h-24 rounded-xl border bg-card px-3 py-3 text-base shadow-xs transition-[color,box-shadow,background-color,border-color] duration-200 outline-none md:text-sm",
          "dark:bg-surface-2",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
