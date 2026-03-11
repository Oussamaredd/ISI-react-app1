import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureCurrentLocation,
  captureCurrentLocationIfAvailable
} from "../device/location";

const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = vi.hoisted(() => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn()
}));

vi.mock("expo-location", () => ({
  Accuracy: { High: "high" },
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync
}));

describe("location helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null from the optional helper when access is denied", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(captureCurrentLocationIfAvailable()).resolves.toBeNull();
  });

  it("returns rounded coordinates when access is granted", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 48.8566129,
        longitude: 2.3522219
      }
    });

    await expect(captureCurrentLocationIfAvailable()).resolves.toEqual({
      latitude: "48.856613",
      longitude: "2.352222"
    });
  });

  it("keeps the strict helper behavior for flows that require location", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(captureCurrentLocation()).rejects.toThrow("Location access was not granted.");
  });
});
