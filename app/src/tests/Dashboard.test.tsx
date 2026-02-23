import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Dashboard from "../pages/Dashboard";
import { renderWithProviders } from "./test-utils";

const jsonHeaders = new Headers({ "content-type": "application/json" });

const authResponsePayload = {
  authenticated: true,
  user: { displayName: "Test User", email: "test@example.com" },
};

const dashboardResponsePayload = {
  summary: {
    total: 42,
    open: 12,
    completed: 24,
    assigned: 36,
  },
  statusBreakdown: {
    open: 12,
    in_progress: 6,
    completed: 24,
  },
  recentActivity: [
    { date: "2026-02-08", created: 3, updated: 5 },
    { date: "2026-02-09", created: 4, updated: 6 },
    { date: "2026-02-10", created: 2, updated: 8 },
  ],
  recentTickets: [
    {
      id: "1",
      name: "Lobby AC issue",
      status: "open",
      hotelName: "EcoTrack Downtown",
      createdAt: "2026-02-10T09:00:00.000Z",
      updatedAt: "2026-02-11T10:00:00.000Z",
    },
  ],
  hotels: [
    { id: "h1", name: "EcoTrack Downtown", ticketCount: 14 },
    { id: "h2", name: "EcoTrack River", ticketCount: 8 },
  ],
};

const createJsonResponse = (payload: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: jsonHeaders,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }) as Response;

beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("/api/dashboard")) {
      return createJsonResponse(dashboardResponsePayload);
    }

    return createJsonResponse(authResponsePayload);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard Component", () => {
  test("renders an EcoTrack activity dashboard", async () => {
    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Welcome back, Test/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Total tickets/i)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/Recent ticket activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Lobby AC issue/i)).toBeInTheDocument();
  });

  test("does not render dashboard quick links that redirect to other pages", async () => {
    renderWithProviders(<Dashboard />);

    await screen.findByRole("heading", { name: /Welcome back, Test/i });

    expect(
      screen.queryByRole("link", { name: /View Tickets/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Create Ticket/i }),
    ).not.toBeInTheDocument();
  });
});
