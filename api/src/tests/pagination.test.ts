import { describe, expect, it } from "vitest";

import { normalizeSearchTerm, parsePaginationParams } from "../common/http/pagination";

describe("pagination helpers", () => {
  it("uses safe defaults for missing or invalid values", () => {
    expect(parsePaginationParams()).toEqual({
      page: 1,
      pageSize: 20,
      limit: 20,
      offset: 0,
    });

    expect(parsePaginationParams("0", "-5")).toEqual({
      page: 1,
      pageSize: 20,
      limit: 20,
      offset: 0,
    });
  });

  it("parses positive values and computes offset", () => {
    expect(parsePaginationParams("3", "15")).toEqual({
      page: 3,
      pageSize: 15,
      limit: 15,
      offset: 30,
    });
  });

  it("caps page size to the hard maximum", () => {
    expect(parsePaginationParams("2", "500")).toEqual({
      page: 2,
      pageSize: 100,
      limit: 100,
      offset: 100,
    });
  });
});

describe("search term normalization", () => {
  it("returns undefined for empty inputs", () => {
    expect(normalizeSearchTerm()).toBeUndefined();
    expect(normalizeSearchTerm("   ")).toBeUndefined();
  });

  it("trims and returns non-empty terms", () => {
    expect(normalizeSearchTerm("  overflowing bins  ")).toBe("overflowing bins");
  });
});
