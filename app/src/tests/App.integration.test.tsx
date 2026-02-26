import { screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, test, expect, Mock } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useAuth", () => {
  return {
    useCurrentUser: vi.fn(),
    useAuth: vi.fn(() => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: vi.fn(),
      getAuthHeaders: () => ({}),
    })),
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
      await screen.findByRole(
        "heading",
        { name: /Bridge every ticket handoff/i },
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();

    const getStartedLinks = await screen.findAllByRole(
      "link",
      { name: /Get Started/i },
      { timeout: 8000 },
    );
    expect(getStartedLinks.some((link) => link.getAttribute("href") === "/login")).toBe(true);
  });

  test("renders authenticated app when user is logged in", async () => {
    const { useCurrentUser } = await import("../hooks/useAuth");
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: "123", displayName: "Test User", email: "test@example.com" },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: "123", displayName: "Test User" } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    expect(await screen.findByText("Test User")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Support" })).toBeInTheDocument();
  });

  test("navigation links work correctly", async () => {
    const { useCurrentUser } = await import("../hooks/useAuth");
    (useCurrentUser as unknown as Mock).mockReturnValue({
      user: { id: "123", displayName: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, user: { id: "123", displayName: "Test User" } }),
      text: async () => JSON.stringify({ authenticated: true }),
    } as Response);

    renderApp();

    await waitFor(() => expect(screen.getByRole("link", { name: "Support" })).toBeInTheDocument());

    const supportLinks = screen.getAllByRole("link", { name: "Support" });
    expect(supportLinks.some((link) => link.getAttribute("href") === "/app/support")).toBe(
      true,
    );

    const dashboardLinks = screen.getAllByRole("link", { name: "Dashboard" });
    expect(dashboardLinks.some((link) => link.getAttribute("href") === "/app/dashboard")).toBe(true);
  });
});
