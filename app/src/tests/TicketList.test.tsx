// client/src/tests/TicketList.test.tsx
import { screen, waitForElementToBeRemoved } from "@testing-library/react";
import { vi, beforeEach, afterEach, expect, test, describe } from "vitest";
import TicketList from "../components/TicketList";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useTickets", () => ({
  useTickets: () => ({
    data: { tickets: [] },
    isLoading: false,
    error: null,
  }),
}));

describe("TicketList", () => {
  test("renders ticket list", async () => {
    renderWithProviders(<TicketList />);

    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });
});
