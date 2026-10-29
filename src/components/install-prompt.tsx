import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface PromptInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [evento, setEvento] = useState<PromptInstalar | null>(null);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setEvento(event as PromptInstalar);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!evento || oculto) return null;

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const choice = await evento.userChoice;
    if (choice.outcome !== "accepted") setOculto(true);
    setEvento(null);
  }

  return (
    <div className="border-border bg-card/95 no-print flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
      <p>Puedes instalar Janeth Pedidos en este celular.</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOculto(true)}>
          Ahora no
        </Button>
        <Button type="button" size="sm" onClick={() => void instalar()}>
          Instalar app
        </Button>
      </div>
    </div>
  );
}
