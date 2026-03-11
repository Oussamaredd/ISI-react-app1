import { describe, expect, it } from "vitest";

import { mobileFeatureBlueprint } from "../lib/architecture";

describe("mobileFeatureBlueprint", () => {
  it("declares the starter shell routes we expect to wire first", () => {
    expect(mobileFeatureBlueprint).toHaveLength(7);
    expect(mobileFeatureBlueprint.map((item) => item.key)).toEqual([
      "dashboard",
      "report",
      "challenges",
      "history",
      "schedule",
      "agent-home",
      "manager-home"
    ]);
  });

  it("keeps route declarations unique", () => {
    const routes = mobileFeatureBlueprint.map((item) => item.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
