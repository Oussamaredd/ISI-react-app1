// client/src/tests/App.test.tsx
import { screen } from "@testing-library/react";
import { vi, test, expect } from "vitest";
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


test("renders navigation buttons", async () => {
  renderWithProviders(<App />);

  expect(await screen.findByText(/simple list/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/create ticket/i)).length).toBeGreaterThan(0);
});
