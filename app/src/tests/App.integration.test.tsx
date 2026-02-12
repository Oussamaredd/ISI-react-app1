import { screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, test, expect, Mock } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useAuth", () => {
  return {
    useCurrentUser: vi.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockFetch = vi.fn();

const renderApp = (route = "/") =>
  renderWithProviders(<App />, {
    route,
    initialEntries: [route],
  });

describe("App Integration", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders landing screen when not authenticated", async () => {
    const { useCurrentUser } = await import("../hooks/useAuth");
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
      text: async () => JSON.stringify({ authenticated: false }),
    } as Response);

    renderApp();

    expect(
      await screen.findByRole("heading", { name: /Bridge every ticket handoff/i }),
    ).toBeInTheDocument();
    const getStartedLinks = screen.getAllByRole("link", { name: /Get Started/i });
    expect(getStartedLinks.some((link) => link.getAttribute("href") === "/auth")).toBe(true);
  });

  test("renders authenticated app when user is logged in", async () => {
    const { useCurrentUser } = await import("../hooks/useAuth");
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: "123", name: "Test User", email: "test@example.com" },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: "123", name: "Test User" } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    await waitFor(() => expect(screen.getByText("Logged in as Test User")).toBeInTheDocument());

    expect(screen.getByText("Simple List")).toBeInTheDocument();
    expect(screen.getAllByText("Create Ticket").length).toBeGreaterThan(0);
  });

  test("navigation links work correctly", async () => {
    const { useCurrentUser } = await import("../hooks/useAuth");
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: "123", name: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: "123", name: "Test User" } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    await waitFor(() => expect(screen.getByText("Simple List")).toBeInTheDocument());

    const createTicketLinks = screen.getAllByRole("link", { name: "Create Ticket" });
    expect(createTicketLinks.some((link) => link.getAttribute("href") === "/app/tickets/create")).toBe(
      true,
    );

    const ticketsListLinks = screen.getAllByRole("link", { name: "Simple List" });
    expect(ticketsListLinks.some((link) => link.getAttribute("href") === "/app/tickets")).toBe(true);
  });
});
