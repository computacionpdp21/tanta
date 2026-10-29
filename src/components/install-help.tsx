import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InstallHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instalar en el celular</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-3 text-sm">
        <div>
          <p className="text-foreground font-medium">Android (Chrome)</p>
          <p>
            Si aparece el aviso “Instalar app”, tócalo. Si no: menú de Chrome (tres puntos) → Instalar
            aplicación / Añadir a pantalla de inicio.
          </p>
        </div>
        <div>
          <p className="text-foreground font-medium">iPhone (Safari)</p>
          <p>Toca Compartir → Añadir a pantalla de inicio → Añadir. No uses Chrome en iPhone para instalarla.</p>
        </div>
      </CardContent>
    </Card>
  );
}
