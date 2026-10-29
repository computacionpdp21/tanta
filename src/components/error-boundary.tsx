import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  compact?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 px-6 text-center",
          this.props.compact ? "min-h-[40vh] py-12" : "min-h-dvh",
        )}
      >
        <h1 className="font-display text-2xl font-semibold">Algo se trabó</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {this.state.error.message ||
            "No perdimos los pedidos. Toca reintentar o recarga la página."}
        </p>
        <Button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }
}
