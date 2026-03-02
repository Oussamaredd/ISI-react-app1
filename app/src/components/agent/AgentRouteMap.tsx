import { useMemo } from "react";

type RouteStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

type AgentRouteMapProps = {
  stops: RouteStop[];
};

type ProjectedStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
};

type MapBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 68;
const PARIS_CENTER = {
  latitude: 48.8566,
  longitude: 2.3522,
};
const MIN_LATITUDE_SPAN = 0.014;
const MIN_LONGITUDE_SPAN = 0.02;
const MAP_PADDING_RATIO = 0.26;
const MAP_EMBED_BASE_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_MAP_EMBED_BASE_URL?.trim() ||
  "https://www.openstreetmap.org/export/embed.html";

const toNumberOrNull = (value: string | null | undefined) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const createBounds = (latitudes: number[], longitudes: number[]): MapBounds => {
  const rawMinLatitude = Math.min(...latitudes);
  const rawMaxLatitude = Math.max(...latitudes);
  const rawMinLongitude = Math.min(...longitudes);
  const rawMaxLongitude = Math.max(...longitudes);
  const centerLatitude = (rawMinLatitude + rawMaxLatitude) / 2;
  const centerLongitude = (rawMinLongitude + rawMaxLongitude) / 2;
  const latitudeSpan = Math.max(rawMaxLatitude - rawMinLatitude, MIN_LATITUDE_SPAN);
  const longitudeSpan = Math.max(rawMaxLongitude - rawMinLongitude, MIN_LONGITUDE_SPAN);
  const paddedLatitudeSpan = latitudeSpan * (1 + MAP_PADDING_RATIO);
  const paddedLongitudeSpan = longitudeSpan * (1 + MAP_PADDING_RATIO);

  const minLatitude = clamp(centerLatitude - paddedLatitudeSpan / 2, -85, 85);
  const maxLatitude = clamp(centerLatitude + paddedLatitudeSpan / 2, -85, 85);
  const minLongitude = clamp(centerLongitude - paddedLongitudeSpan / 2, -180, 180);
  const maxLongitude = clamp(centerLongitude + paddedLongitudeSpan / 2, -180, 180);

  return {
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  };
};

const createParisFallbackBounds = () =>
  createBounds([PARIS_CENTER.latitude], [PARIS_CENTER.longitude]);

const buildEmbedUrl = (bounds: MapBounds) => {
  const params = new URLSearchParams({
    bbox: [
      bounds.minLongitude.toFixed(6),
      bounds.minLatitude.toFixed(6),
      bounds.maxLongitude.toFixed(6),
      bounds.maxLatitude.toFixed(6),
    ].join(","),
    layer: "mapnik",
  });

  return `${MAP_EMBED_BASE_URL}?${params.toString()}`;
};

const buildProjectedStops = (geoStops: Omit<ProjectedStop, "x" | "y">[], bounds: MapBounds) => {
  const latitudeSpan = Math.max(bounds.maxLatitude - bounds.minLatitude, Number.EPSILON);
  const longitudeSpan = Math.max(bounds.maxLongitude - bounds.minLongitude, Number.EPSILON);

  return geoStops.map((stop) => {
    const x = ((stop.longitude - bounds.minLongitude) / longitudeSpan) * VIEWBOX_WIDTH;
    const y = ((bounds.maxLatitude - stop.latitude) / latitudeSpan) * VIEWBOX_HEIGHT;

    return {
      ...stop,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });
};

export default function AgentRouteMap({ stops }: AgentRouteMapProps) {
  const mapState = useMemo(() => {
    const geoStops = stops
      .map((stop) => {
        const latitude = toNumberOrNull(stop.latitude);
        const longitude = toNumberOrNull(stop.longitude);

        if (latitude == null || longitude == null) {
          return null;
        }

        return {
          ...stop,
          latitude,
          longitude,
        };
      })
      .filter((stop): stop is Omit<ProjectedStop, "x" | "y"> => stop != null);

    if (geoStops.length === 0) {
      const fallbackBounds = createParisFallbackBounds();

      return {
        hasRoute: false,
        embedUrl: buildEmbedUrl(fallbackBounds),
        projectedStops: [] as ProjectedStop[],
      };
    }

    const bounds = createBounds(
      geoStops.map((stop) => stop.latitude),
      geoStops.map((stop) => stop.longitude),
    );

    return {
      hasRoute: true,
      embedUrl: buildEmbedUrl(bounds),
      projectedStops: buildProjectedStops(geoStops, bounds),
    };
  }, [stops]);

  const routePath = useMemo(() => {
    if (mapState.projectedStops.length < 2) {
      return "";
    }

    return mapState.projectedStops.reduce((path, stop, index) => {
      if (index === 0) {
        return `M ${stop.x} ${stop.y}`;
      }

      return `${path} L ${stop.x} ${stop.y}`;
    }, "");
  }, [mapState.projectedStops]);

  return (
    <div className="ops-route-map-shell">
      <div className="ops-route-map-stack">
        <iframe
          title={mapState.hasRoute ? "OpenStreetMap tour overview" : "OpenStreetMap Paris fallback"}
          src={mapState.embedUrl}
          className="ops-route-map-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="ops-route-map-overlay"
          role="img"
          aria-label={
            mapState.hasRoute
              ? "OpenStreetMap route overview with numbered stops"
              : "OpenStreetMap Paris fallback view"
          }
        >
          <rect
            x="0"
            y="0"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            fill="rgba(5, 12, 22, 0.08)"
          />

          {routePath ? (
            <>
              <path
                d={routePath}
                fill="none"
                stroke="rgba(10, 18, 32, 0.55)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={routePath}
                fill="none"
                stroke="#2f7bff"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {mapState.projectedStops.map((stop) => {
            const status = normalizeStatus(stop.status);
            const markerFill =
              status === "completed"
                ? "#49d9a2"
                : status === "active"
                  ? "#ffd166"
                  : "#2bd4a8";

            return (
              <g key={stop.id}>
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r="3.3"
                  fill={markerFill}
                  stroke="rgba(5, 12, 22, 0.95)"
                  strokeWidth="0.8"
                />
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r="6"
                  fill="none"
                  stroke="rgba(47, 123, 255, 0.24)"
                  strokeWidth="0.7"
                />
                <text
                  x={stop.x}
                  y={stop.y + 1.2}
                  textAnchor="middle"
                  fontSize="3"
                  fontWeight="700"
                  fill="#06111f"
                >
                  {stop.stopOrder}
                </text>
              </g>
            );
          })}
        </svg>

        {!mapState.hasRoute ? (
          <div className="ops-route-map-banner">
            No stop coordinates were available. Showing the Paris service area fallback.
          </div>
        ) : null}
      </div>

      <div className="ops-route-map-legend" aria-hidden="true">
        <span>OpenStreetMap basemap</span>
        <span>{mapState.hasRoute ? "Ordered stop overlay" : "Paris fallback view"}</span>
      </div>
    </div>
  );
}
