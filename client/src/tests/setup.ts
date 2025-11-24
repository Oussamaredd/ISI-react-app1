// src/tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mocking global fetch
globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
  let url: string;

  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    // input is a Request
    url = input.url;
  }

  if (url.includes("/auth/me")) {
    return {
      ok: true,
      json: async () => ({ id: "1", name: "Test User", email: "test@mail.com" }),
    } as Response;
  }

  if (url.includes("/api/tickets")) {
    return {
      ok: true,
      json: async () => [],
    } as Response;
  }

  if (url.includes("/api/hotels")) {
    return {
      ok: true,
      json: async () => [],
    } as Response;
  }

  return {
    ok: true,
    json: async () => ({}),
  } as Response;
});

