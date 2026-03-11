import { describe, expect, it } from "vitest";

import { resolvePhotoPreviewAspectRatio } from "../device/media";

describe("resolvePhotoPreviewAspectRatio", () => {
  it("falls back to a square preview when there is no photo", () => {
    expect(resolvePhotoPreviewAspectRatio()).toBe(1);
  });

  it("keeps the aspect ratio inside a safe preview range", () => {
    expect(resolvePhotoPreviewAspectRatio({ width: 1600, height: 400 })).toBe(1.8);
    expect(resolvePhotoPreviewAspectRatio({ width: 300, height: 600 })).toBe(0.7);
  });
});
