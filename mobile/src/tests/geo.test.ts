import { describe, expect, it } from "vitest";

import { bearingDegrees, haversineDistanceMeters, rankContainersByDistance } from "../lib/geo";

describe("geo helpers", () => {
  it("calculates a finite distance for valid coordinates", () => {
    const distance = haversineDistanceMeters(
      { latitude: "36.8100", longitude: "10.1900" },
      { latitude: "36.8200", longitude: "10.2000" }
    );

    expect(distance).toBeGreaterThan(0);
    expect(Number.isFinite(distance)).toBe(true);
  });

  it("ranks containers from nearest to farthest", () => {
    const rankedContainers = rankContainersByDistance(
      { latitude: "36.8100", longitude: "10.1900" },
      [
        {
          id: "far",
          latitude: "36.8300",
          longitude: "10.2300"
        },
        {
          id: "near",
          latitude: "36.8110",
          longitude: "10.1910"
        }
      ],
      2
    );

    expect(rankedContainers.map((container) => container.id)).toEqual(["near", "far"]);
  });

  it("calculates a valid compass bearing between two coordinates", () => {
    const bearing = bearingDegrees(
      { latitude: "36.8100", longitude: "10.1900" },
      { latitude: "36.8200", longitude: "10.2000" }
    );

    expect(typeof bearing).toBe("number");
    expect((bearing ?? 0) >= 0).toBe(true);
    expect((bearing ?? 0) < 360).toBe(true);
  });
});
