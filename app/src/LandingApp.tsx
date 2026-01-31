// client/src/LandingApp.tsx - Standalone landing page without auth dependencies
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from "./context/ToastContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function LandingApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demo" element={<Dashboard />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}