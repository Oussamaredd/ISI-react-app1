import type { CitizenReportPayload } from "@api/modules/citizen";
import type { CapturedLocation } from "@/device/location";
import type { CapturedPhoto } from "@/device/media";
import {
  buildCapturedPhotoDataUrl,
  type CitizenReportType
} from "@/lib/citizenReports";

type CaptureOrigin = "discover" | "composer";

export const PHOTO_CAPTURE_CANCELED_STATUS = "Photo capture canceled.";
export const PHOTO_LOCATION_UNAVAILABLE_STATUS =
  "Photo evidence captured. Location unavailable right now; refresh it before sending.";
export const REPORT_SENT_STATUS = "Report sent. History and challenge points are refreshing.";

export const buildGpsStatusMessage = (origin: CaptureOrigin, nearbyCount: number) => {
  if (origin === "discover") {
    return nearbyCount > 0
      ? `GPS active. Map centered on your position with ${nearbyCount} nearby containers highlighted.`
      : "GPS active. Map centered on your position.";
  }

  return nearbyCount > 0
    ? `Location refreshed. Map centered on your position with ${nearbyCount} nearby containers highlighted.`
    : "Location refreshed.";
};

export const buildCameraStatusMessage = (origin: CaptureOrigin, nearbyCount: number) => {
  if (origin === "discover") {
    return nearbyCount > 0
      ? "Photo evidence captured. Map centered on your position with nearby containers highlighted."
      : "Photo evidence captured with live coordinates.";
  }

  return "Photo evidence captured with refreshed location.";
};

export const shouldShowStatusMessage = (
  statusMessage?: string | null,
  errorMessage?: string | null
) => Boolean(statusMessage) && !Boolean(errorMessage);

export const buildCitizenReportPayload = ({
  containerId,
  description,
  location,
  photoEvidence,
  reportType
}: {
  containerId: string;
  description: string;
  location: CapturedLocation;
  photoEvidence: CapturedPhoto | null;
  reportType: CitizenReportType;
}): CitizenReportPayload => ({
  containerId,
  reportType,
  description: description.trim() || undefined,
  latitude: location.latitude,
  longitude: location.longitude,
  photoUrl: buildCapturedPhotoDataUrl(photoEvidence) ?? undefined
});
