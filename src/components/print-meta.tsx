import { APP_NAME } from "@/lib/constants";
import { formatImpresoEn } from "@/lib/dates";

export function PrintMeta({ titulo }: { titulo: string }) {
  return (
    <div className="mb-4 hidden print:block">
      <p className="font-display text-2xl font-semibold">{APP_NAME}</p>
      <p className="text-lg font-medium">{titulo}</p>
      <p className="text-sm">Impreso el {formatImpresoEn()} (hora de Santa Cruz)</p>
    </div>
  );
}
