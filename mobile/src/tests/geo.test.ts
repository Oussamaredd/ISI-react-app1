import { describe, expect, it } from "vitest";

import {
  bearingDegrees,
  clusterViewportTargets,
  haversineDistanceMeters,
  projectCoordinateToViewport,
  rankContainersByDistance
} from "../lib/geo";

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

  it("projects visible coordinates into the current viewport", () => {
    const projection = projectCoordinateToViewport(
      {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      },
      { latitude: "48.8566", longitude: "2.3522" }
    );

    expect(projection).not.toBeNull();
    expect(projection?.leftPercent).toBeCloseTo(50, 1);
    expect(projection?.topPercent).toBeCloseTo(50, 1);
    expect(projection?.isVisible).toBe(true);
  });

  it("clamps offscreen coordinates to the viewport edge", () => {
    const projection = projectCoordinateToViewport(
      {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      },
      { latitude: "48.9566", longitude: "2.4522" }
    );

    expect(projection).not.toBeNull();
    expect(projection?.isVisible).toBe(false);
    expect(projection?.leftPercent).toBeLessThanOrEqual(88);
    expect(projection?.topPercent).toBeGreaterThanOrEqual(14);
  });

  it("clusters overlapping viewport targets and keeps the nearest target as primary", () => {
    const clusters = clusterViewportTargets(
      [
        {
          id: "closest",
          leftPercent: 84,
          topPercent: 24,
          distanceMeters: 120
        },
        {
          id: "overlap",
          leftPercent: 85.5,
          topPercent: 25.2,
          distanceMeters: 180
        },
        {
          id: "separate",
          leftPercent: 18,
          topPercent: 76,
          distanceMeters: 90
        }
      ],
      4
    );

    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.primaryItem.id).toBe("separate");
    expect(clusters[1]?.items).toHaveLength(2);
    expect(clusters[1]?.primaryItem.id).toBe("closest");
  });
});
