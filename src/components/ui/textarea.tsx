import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "placeholder:text-muted-foreground border-input dark:bg-input/30 w-full min-h-24 rounded-xl border bg-card px-3 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
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
