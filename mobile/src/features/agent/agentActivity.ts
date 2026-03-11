import type {
  AgentTourActivityItem,
  AgentTourStop
} from "@api/modules/tours";

export const normalizeOperationalStatus = (status?: string | null) =>
  status?.trim().toLowerCase() ?? "";

export const resolveActiveTourStop = (stops: AgentTourStop[]) =>
  stops.find((stop) => normalizeOperationalStatus(stop.status) === "active") ??
  stops.find((stop) => normalizeOperationalStatus(stop.status) === "pending") ??
  null;

export const resolveNextTourStop = (
  stops: AgentTourStop[],
  activeStop: AgentTourStop | null
) => {
  if (!activeStop) {
    return null;
  }

  return (
    stops.find(
      (stop) =>
        stop.id !== activeStop.id &&
        stop.stopOrder > activeStop.stopOrder &&
        normalizeOperationalStatus(stop.status) !== "completed"
    ) ?? null
  );
};

const readActivityDetails = (details: unknown) =>
  details && typeof details === "object"
    ? (details as Record<string, unknown>)
    : {};

export const describeAgentActivity = (item: AgentTourActivityItem) => {
  const details = readActivityDetails(item.details);

  switch (item.type) {
    case "tour_started":
      return {
        title: "Tour started",
        summary: "Agent marked the route as in progress."
      };
    case "collection_validated": {
      const volume = details.volumeLiters;

      return {
        title: "Collection validated",
        summary:
          typeof volume === "number"
            ? `${volume} liters recorded at the stop.`
            : "Collection volume recorded."
      };
    }
    case "anomaly_reported": {
      const severity =
        typeof details.severity === "string" &&
        details.severity.trim().length > 0
          ? details.severity
          : "unspecified";
      const comments =
        typeof details.comments === "string" &&
        details.comments.trim().length > 0
          ? details.comments
          : null;

      return {
        title: "Anomaly reported",
        summary: comments
          ? `${severity} severity. ${comments}`
          : `${severity} severity alert sent to the manager queue.`
      };
    }
    default:
      return {
        title: item.type,
        summary: "Operational activity recorded."
      };
  }
};
