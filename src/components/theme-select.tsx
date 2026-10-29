import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPCIONES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Oscuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Laptop },
];

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Apariencia">
      {OPCIONES.map((item) => {
        const Icon = item.icon;
        const activo = theme === item.id;
        return (
          <Button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={activo}
            variant={activo ? "default" : "outline"}
            className={cn("flex-col gap-1 py-3 h-auto min-h-11")}
            onClick={() => setTheme(item.id)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
