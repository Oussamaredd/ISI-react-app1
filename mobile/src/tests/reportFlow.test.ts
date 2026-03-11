import { describe, expect, it } from "vitest";

import {
  buildCameraStatusMessage,
  buildCitizenReportPayload,
  buildGpsStatusMessage,
  PHOTO_CAPTURE_CANCELED_STATUS,
  PHOTO_LOCATION_UNAVAILABLE_STATUS,
  REPORT_SENT_STATUS,
  shouldShowStatusMessage
} from "@/features/reports/reportFlow";

describe("reportFlow helpers", () => {
  it("builds discover and composer GPS statuses from nearby container counts", () => {
    expect(buildGpsStatusMessage("discover", 3)).toBe(
      "GPS active. Map centered on your position with 3 nearby containers highlighted."
    );
    expect(buildGpsStatusMessage("discover", 0)).toBe("GPS active. Map centered on your position.");
    expect(buildGpsStatusMessage("composer", 0)).toBe("Location refreshed.");
  });

  it("builds camera statuses without changing the existing discover or composer semantics", () => {
    expect(buildCameraStatusMessage("discover", 2)).toBe(
      "Photo evidence captured. Map centered on your position with nearby containers highlighted."
    );
    expect(buildCameraStatusMessage("discover", 0)).toBe(
      "Photo evidence captured with live coordinates."
    );
    expect(buildCameraStatusMessage("composer", 4)).toBe(
      "Photo evidence captured with refreshed location."
    );
  });

  it("exposes the report status constants used by the screen", () => {
    expect(PHOTO_CAPTURE_CANCELED_STATUS).toBe("Photo capture canceled.");
    expect(PHOTO_LOCATION_UNAVAILABLE_STATUS).toBe(
      "Photo evidence captured. Location unavailable right now; refresh it before sending."
    );
    expect(REPORT_SENT_STATUS).toBe("Report sent. History and challenge points are refreshing.");
  });

  it("shows status copy only when no error is active", () => {
    expect(shouldShowStatusMessage("Location refreshed.", null)).toBe(true);
    expect(shouldShowStatusMessage("Location refreshed.", "Location access was not granted.")).toBe(
      false
    );
    expect(shouldShowStatusMessage(null, null)).toBe(false);
  });

  it("builds the exact citizen report payload expected by the API", () => {
    expect(
      buildCitizenReportPayload({
        containerId: "container-1",
        description: "  Overflowing near the school gate  ",
        location: {
          latitude: "48.856613",
          longitude: "2.352222"
        },
        photoEvidence: {
          base64: "YWJj",
          height: 600,
          mimeType: "image/jpeg",
          uri: "file://camera-shot.jpg",
          width: 800
        },
        reportType: "container_full"
      })
    ).toEqual({
      containerId: "container-1",
      description: "Overflowing near the school gate",
      latitude: "48.856613",
      longitude: "2.352222",
      photoUrl: "data:image/jpeg;base64,YWJj",
      reportType: "container_full"
    });
  });

  it("omits optional payload fields when description and photo evidence are empty", () => {
    expect(
      buildCitizenReportPayload({
        containerId: "container-2",
        description: "   ",
        location: {
          latitude: "48.850000",
          longitude: "2.350000"
        },
        photoEvidence: null,
        reportType: "general_issue"
      })
    ).toEqual({
      containerId: "container-2",
      description: undefined,
      latitude: "48.850000",
      longitude: "2.350000",
      photoUrl: undefined,
      reportType: "general_issue"
    });
  });
});
