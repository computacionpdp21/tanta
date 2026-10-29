import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/auth/auth-context";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (count, error) => {
        const text = error instanceof Error ? error.message.toLowerCase() : "";
        if (text.includes("jwt") || text.includes("autorizado") || text.includes("401")) {
          return false;
        }
        return count < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el elemento #root");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
