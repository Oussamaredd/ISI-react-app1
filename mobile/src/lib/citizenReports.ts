import type { ContainerOption } from "@api/modules/containers";
import type { CapturedPhoto } from "@/device/media";
import { rankContainersByDistance, toCoordinateNumber, type NearbyMatch } from "@/lib/geo";

export const citizenReportTypes = [
  {
    value: "container_full",
    label: "Conteneur plein",
    helper: "Signal a container that is already full or close to overflow."
  },
  {
    value: "damaged_container",
    label: "Conteneur endommage",
    helper: "Use this when the structure, lid, or wheels are damaged."
  },
  {
    value: "access_blocked",
    label: "Acces bloque",
    helper: "Use this when vehicles or obstacles block access."
  },
  {
    value: "general_issue",
    label: "Autre probleme",
    helper: "Use this for issues that do not fit the main categories."
  }
] as const;

export type CitizenReportType = (typeof citizenReportTypes)[number]["value"];

export const DEFAULT_CITIZEN_REPORT_TYPE: CitizenReportType = "container_full";
export const DUPLICATE_REPORT_WINDOW_MS = 60 * 60 * 1000;

const reportTypeLabels = new Map(
  citizenReportTypes.map((item) => [item.value, item.label] as const)
);

export const formatCitizenReportTypeLabel = (reportType?: string | null) =>
  reportTypeLabels.get((reportType ?? DEFAULT_CITIZEN_REPORT_TYPE) as CitizenReportType) ??
  reportTypeLabels.get(DEFAULT_CITIZEN_REPORT_TYPE) ??
  "Conteneur plein";

export const hasContainerCoordinates = (
  container?: Pick<ContainerOption, "latitude" | "longitude"> | null
) =>
  toCoordinateNumber(container?.latitude) != null &&
  toCoordinateNumber(container?.longitude) != null;

export const buildMapRegion = (
  location?: Pick<ContainerOption, "latitude" | "longitude"> | null,
  zoom = 0.018
) => {
  const latitude = toCoordinateNumber(location?.latitude);
  const longitude = toCoordinateNumber(location?.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    latitude,
    longitude,
    latitudeDelta: zoom,
    longitudeDelta: zoom
  };
};

export const mergeContainerCollections = (...collections: ContainerOption[][]) => {
  const merged = new Map<string, ContainerOption>();

  for (const collection of collections) {
    for (const container of collection) {
      merged.set(container.id, container);
    }
  }

  return Array.from(merged.values());
};

export const buildCapturedPhotoDataUrl = (photo?: CapturedPhoto | null) => {
  if (!photo?.base64) {
    return null;
  }

  const mimeType = photo.mimeType?.trim() || "image/jpeg";
  return `data:${mimeType};base64,${photo.base64}`;
};

export const resolveNearestContainer = (
  containers: ContainerOption[],
  origin?: Pick<ContainerOption, "latitude" | "longitude"> | null
): NearbyMatch<ContainerOption> | null => {
  const ranked = rankContainersByDistance(origin ?? {}, containers.filter(hasContainerCoordinates), 1);
  return ranked[0] ?? null;
};

type HistoryDuplicateLike = {
  containerId: string;
  reportedAt: string;
};

export const findRecentDuplicateHistoryItem = <T extends HistoryDuplicateLike>(
  history: T[],
  containerId?: string | null,
  now = Date.now()
) => {
  if (!containerId) {
    return null;
  }

  return (
    history.find((item) => {
      if (item.containerId !== containerId) {
        return false;
      }

      const reportedAtMs = new Date(item.reportedAt).getTime();
      if (!Number.isFinite(reportedAtMs)) {
        return false;
      }

      return now - reportedAtMs < DUPLICATE_REPORT_WINDOW_MS;
    }) ?? null
  );
};

export const formatRelativeReportTime = (reportedAt?: string | null, now = Date.now()) => {
  if (!reportedAt) {
    return "recently";
  }

  const reportedAtMs = new Date(reportedAt).getTime();
  if (!Number.isFinite(reportedAtMs)) {
    return "recently";
  }

  const minutes = Math.max(1, Math.round((now - reportedAtMs) / 60_000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
};
