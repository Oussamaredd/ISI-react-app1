// @vitest-environment node

import { describe, expect, test } from "vitest";

import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
  hasSupportWorkspaceAccess,
  type UserLike,
} from "../utils/authz";

describe("authz role helpers", () => {
  test("grants admin access from singular role field", () => {
    const user: UserLike = { role: "admin" };
    expect(hasAdminAccess(user)).toBe(true);
  });

  test("grants admin access from roles array", () => {
    const user: UserLike = {
      roles: [{ name: "viewer" }, { name: "super_admin" }],
    };
    expect(hasAdminAccess(user)).toBe(true);
  });

  test("does not grant admin access for non-admin role names", () => {
    const user: UserLike = { role: "manager" };
    expect(hasAdminAccess(user)).toBe(false);
  });

  test("grants manager access to manager and admin roles", () => {
    expect(hasManagerAccess({ role: "manager" })).toBe(true);
    expect(hasManagerAccess({ roles: [{ name: "admin" }] })).toBe(true);
  });

  test("returns false for empty or missing user roles", () => {
    expect(hasAdminAccess(null)).toBe(false);
    expect(hasManagerAccess(undefined)).toBe(false);
    expect(hasManagerAccess({ roles: [] })).toBe(false);
    expect(hasCitizenAccess({ role: "" })).toBe(false);
    expect(hasAgentAccess({ role: " " })).toBe(false);
  });

  test("normalizes role names before matching", () => {
    expect(hasAdminAccess({ role: " Admin " })).toBe(true);
    expect(hasManagerAccess({ roles: [{ name: " MANAGER " }] })).toBe(true);
    expect(hasCitizenAccess({ role: " Citizen " })).toBe(true);
    expect(hasAgentAccess({ roles: [{ name: " AGENT " }] })).toBe(true);
  });

  test("grants citizen access to citizen and elevated admin roles", () => {
    expect(hasCitizenAccess({ role: "citizen" })).toBe(true);
    expect(hasCitizenAccess({ role: "admin" })).toBe(true);
    expect(hasCitizenAccess({ roles: [{ name: "super_admin" }] })).toBe(true);
  });

  test("grants agent access to agent and elevated admin roles", () => {
    expect(hasAgentAccess({ role: "agent" })).toBe(true);
    expect(hasAgentAccess({ role: "admin" })).toBe(true);
    expect(hasAgentAccess({ roles: [{ name: "super_admin" }] })).toBe(true);
  });

  test("grants support workspace access to support-facing roles only", () => {
    expect(hasSupportWorkspaceAccess({ role: "agent" })).toBe(true);
    expect(hasSupportWorkspaceAccess({ role: "manager" })).toBe(true);
    expect(hasSupportWorkspaceAccess({ role: "admin" })).toBe(true);
    expect(hasSupportWorkspaceAccess({ role: "citizen" })).toBe(false);
  });

  test("does not grant citizen or agent access to unrelated roles", () => {
    const user: UserLike = { role: "manager" };
    expect(hasCitizenAccess(user)).toBe(false);
    expect(hasAgentAccess(user)).toBe(false);
  });
});
