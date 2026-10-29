import { Skeleton } from "@/components/ui/skeleton";

export function PageFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
