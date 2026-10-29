import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  className?: string;
  variant?: "sidebar" | "menu";
}

export function SignOutButton({ className, variant = "sidebar" }: SignOutButtonProps) {
  const { signOut } = useAuth();

  async function onClick() {
    await signOut();
    toast.success("Sesión cerrada");
  }

  if (variant === "menu") {
    return (
      <Button type="button" variant="outline" className={cn("w-full", className)} onClick={onClick}>
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-11 w-full justify-start gap-2 px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
      onClick={onClick}
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </Button>
  );
}
