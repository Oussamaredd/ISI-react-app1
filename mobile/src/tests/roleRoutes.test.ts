import { describe, expect, it } from "vitest";

import { resolveAuthenticatedHomeRoute } from "../lib/roleRoutes";

describe("resolveAuthenticatedHomeRoute", () => {
  it("prefers the manager lane when the user can access planning", () => {
    expect(
      resolveAuthenticatedHomeRoute({
        id: "u1",
        email: "manager@example.com",
        displayName: "Manager",
        avatarUrl: null,
        role: "manager",
        roles: [{ id: "role-manager", name: "manager" }],
        isActive: true,
        provider: "local"
      })
    ).toBe("/(manager)");
  });

  it("routes agents to the field lane when no manager access exists", () => {
    expect(
      resolveAuthenticatedHomeRoute({
        id: "u2",
        email: "agent@example.com",
        displayName: "Agent",
        avatarUrl: null,
        role: "agent",
        roles: [{ id: "role-agent", name: "agent" }],
        isActive: true,
        provider: "local"
      })
    ).toBe("/(agent)");
  });

  it("falls back to the citizen tabs for citizen-only accounts", () => {
    expect(
      resolveAuthenticatedHomeRoute({
        id: "u3",
        email: "citizen@example.com",
        displayName: "Citizen",
        avatarUrl: null,
        role: "citizen",
        roles: [{ id: "role-citizen", name: "citizen" }],
        isActive: true,
        provider: "local"
      })
    ).toBe("/(tabs)");
  });
});
