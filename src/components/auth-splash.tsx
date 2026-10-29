import { BrandMark } from "@/components/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthSplash() {
  return (
    <div className="login-texture flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <BrandMark size="lg" className="flex-col justify-center gap-4 text-center" />
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <p className="text-muted-foreground text-sm">Cargando sesión…</p>
    </div>
  );
}
