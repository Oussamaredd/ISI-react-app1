export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString();
};

export const formatCoordinates = (latitude?: string | null, longitude?: string | null) => {
  const parts = [latitude, longitude].filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );

  return parts.length > 0 ? parts.join(", ") : "Unavailable";
};

export const formatDistanceMeters = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Unavailable";
  }

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(value / 1000).toFixed(2)} km`;
};
