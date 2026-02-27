// client/src/tests/App.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi, test, expect } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Test User" },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    getAuthHeaders: () => ({}),
  }),
  useCurrentUser: () => ({
    user: { id: "1", name: "Test User" },
    isLoading: false,
    isAuthenticated: true
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

const setMatchMediaDesktop = (isDesktop: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 721px") ? isDesktop : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

beforeEach(() => {
  setMatchMediaDesktop(true);
});


test("renders navigation buttons", async () => {
  renderWithProviders(<App />, {
    route: "/app/dashboard",
    initialEntries: ["/app/dashboard"],
  });

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  }, { timeout: 8000 });

  const productNavigation = await screen.findByRole(
    "navigation",
    { name: /product navigation/i },
    { timeout: 8000 },
  );
  expect(productNavigation).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "Support" }, { timeout: 8000 })).toBeInTheDocument();
});

test("mobile drawer toggle supports click and escape dismissal", async () => {
  setMatchMediaDesktop(false);
  renderWithProviders(<App />, {
    route: "/app/dashboard",
    initialEntries: ["/app/dashboard"],
  });

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  }, { timeout: 8000 });

  const toggleButton = await screen.findByRole(
    "button",
    { name: /open sidebar/i },
    { timeout: 8000 },
  );
  expect(toggleButton).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(toggleButton);

  const closeButton = await screen.findByRole("button", { name: /close sidebar/i });
  expect(closeButton).toHaveAttribute("aria-expanded", "true");
  expect(await screen.findByRole("navigation", { name: /product navigation/i })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });

  const reopenedToggleButton = await screen.findByRole("button", { name: /open sidebar/i });
  await waitFor(() => {
    expect(reopenedToggleButton).toHaveAttribute("aria-expanded", "false");
    expect(reopenedToggleButton).toHaveFocus();
  });
});
