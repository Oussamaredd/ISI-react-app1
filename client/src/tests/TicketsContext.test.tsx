import { renderHook, act } from "@testing-library/react";
import { useContext } from "react";
import { TicketsProvider, TicketsContext } from "../context/Tickets";

describe("TicketsContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TicketsProvider>{children}</TicketsProvider>
  );

  it("should change currentPage when calling setCurrentPage", () => {
    const { result } = renderHook(() => useContext(TicketsContext), { wrapper });

    // 🔥 SonarLint-approved null check
    if (!result.current) {
      throw new Error("Context not available");
    }

    const ctx = result.current;

    act(() => {
      ctx.setCurrentPage("create");
    });

    expect(ctx.currentPage).toBe("create");
  });
});
