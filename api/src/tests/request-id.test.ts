import { describe, expect, it } from "vitest";

import {
  REQUEST_ID_HEADER,
  getRequestIdFromRequest,
  normalizeRequestId,
} from "../common/request-id";

describe("request id normalization", () => {
  it("accepts numeric values and converts them to strings", () => {
    expect(normalizeRequestId(12345)).toBe("12345");
  });

  it("returns trimmed string values", () => {
    expect(normalizeRequestId("  req-1  ")).toBe("req-1");
  });

  it("reads first element from array values", () => {
    expect(normalizeRequestId([" first-id ", "second-id"])).toBe("first-id");
  });

  it("returns undefined for unsupported or blank values", () => {
    expect(normalizeRequestId({ value: "req-1" })).toBeUndefined();
    expect(normalizeRequestId("   ")).toBeUndefined();
  });
});

describe("request id extraction order", () => {
  it("prefers request.requestId over id and headers", () => {
    const request = {
      requestId: "request-scoped-id",
      id: "express-id",
      headers: {
        [REQUEST_ID_HEADER]: "header-id",
      },
    };

    expect(getRequestIdFromRequest(request as never)).toBe("request-scoped-id");
  });

  it("falls back to id and then canonical header", () => {
    expect(
      getRequestIdFromRequest(
        {
          requestId: undefined,
          id: "express-id",
          headers: { [REQUEST_ID_HEADER]: "header-id" },
        } as never,
      ),
    ).toBe("express-id");

    expect(
      getRequestIdFromRequest(
        {
          requestId: undefined,
          id: undefined,
          headers: { [REQUEST_ID_HEADER]: "header-id" },
        } as never,
      ),
    ).toBe("header-id");
  });
});
