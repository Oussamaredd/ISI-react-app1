import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./context/ToastContext";
import { ErrorHandlingSetup } from "./components/ErrorHandlingSetup";
import AppRouter from "./routes/AppRouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorHandlingSetup>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </ErrorHandlingSetup>
      </AuthProvider>
    </QueryClientProvider>
  );
}
