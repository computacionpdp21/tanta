import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  highlights: string[];
  action?: ReactNode;
}

export function PlaceholderPage({
  icon,
  title,
  description,
  phase,
  highlights,
  action,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <EmptyState icon={icon} title={title} description={description}>
        {action}
      </EmptyState>
      <Card>
        <CardHeader>
          <CardTitle>{phase}</CardTitle>
          <CardDescription>Lo que vas a poder hacer aquí:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
