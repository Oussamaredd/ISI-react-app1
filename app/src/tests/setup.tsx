// src/tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach } from "vitest";

afterEach(() => {
  cleanup();
});

globalThis.jest = vi as unknown as typeof jest;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    )
  };
});

// Default global fetch mock (can be overridden per test)
const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request | undefined)?.url ?? "";

  const makeResponse = (ok: boolean, status: number, body: any) =>
    ({
      ok,
      status,
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    } as Response);

  if (url.includes("/auth/status") || url.includes("/auth/me") || url.endsWith("/me")) {
    return makeResponse(false, 401, { authenticated: false });
  }

  if (url.includes("/api/tickets")) {
    return makeResponse(true, 200, []);
  }

  if (url.includes("/api/hotels")) {
    return makeResponse(true, 200, []);
  }

  return makeResponse(true, 200, {});
});

beforeEach(() => {
  mockFetch.mockClear();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

