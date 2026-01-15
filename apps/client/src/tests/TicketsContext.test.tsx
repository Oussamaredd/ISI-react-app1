// client/src/tests/TicketsContext.test.tsx
import { renderHook, act } from "@testing-library/react";
import { TicketsProvider, useTickets } from "../context/Tickets";
import { describe, it, expect } from "vitest";


describe("TicketsContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TicketsProvider>{children}</TicketsProvider>
  );

  it("should change currentPage when calling setCurrentPage", () => {
    const { result } = renderHook(() => useTickets(), { wrapper });

    act(() => {
      result.current.setCurrentPage("create");
    });

    expect(result.current.currentPage).toBe("create");
  });
});