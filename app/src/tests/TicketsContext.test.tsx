// client/src/tests/TicketsContext.test.tsx
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useTickets } from "../hooks/useTickets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";


describe("Tickets hooks", () => {
  it("returns a query result", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useTickets(), { wrapper });

    expect(result.current).toHaveProperty("data");
  });
});
