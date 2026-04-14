import { useEffect, useMemo, useRef } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { GeoJsonLineString, TourRouteGeometry } from "../../hooks/useAgentTours";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL_TEMPLATE } from "../../lib/mapConfig";

type RouteStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

type DepotLocation = {
  label?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type AgentRouteMapProps = {
  stops: RouteStop[];
  depot?: DepotLocation | null;
  routeGeometry?: TourRouteGeometry | null;
};

type NormalizedRouteStop = {
  id: string;
  stopOrder: number;
  status: string;
  containerCode: string;
  containerLabel: string;
  latitude: number;
  longitude: number;
};

type NormalizedDepot = {
  label: string;
  latitude: number;
  longitude: number;
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const toNumberOrNull = (value: string | null | undefined) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const normalizeStops = (stops: RouteStop[]) =>
  stops
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
      } satisfies NormalizedRouteStop;
    })
    .filter((stop): stop is NormalizedRouteStop => stop != null)
    .sort((left, right) => left.stopOrder - right.stopOrder);

const normalizeDepot = (depot: DepotLocation | null | undefined): NormalizedDepot | null => {
  const latitude = toNumberOrNull(depot?.latitude);
  const longitude = toNumberOrNull(depot?.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    label: depot?.label?.trim() || "Zone depot",
    latitude,
    longitude,
  };
};

const buildFallbackLineString = (
  stops: NormalizedRouteStop[],
  depot: NormalizedDepot | null,
): GeoJsonLineString | null => {
  const routePoints = [
    ...(depot ? [[depot.longitude, depot.latitude] as [number, number]] : []),
    ...stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
  ];

  return routePoints.length >= 2
    ? {
        type: "LineString",
        coordinates: routePoints,
      }
    : null;
};

const toLatLngPath = (geometry: GeoJsonLineString | null) =>
  geometry?.coordinates
    .filter(
      (coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
    )
    .map((coordinate) => [coordinate[1], coordinate[0]] as [number, number]) ?? [];

const buildOverlaySignature = (
  stops: NormalizedRouteStop[],
  geometry: GeoJsonLineString | null,
  geometrySource: string,
  depot: NormalizedDepot | null,
) =>
  [
    stops
      .map(
        (stop) =>
          `${stop.id}:${stop.stopOrder}:${stop.latitude.toFixed(6)},${stop.longitude.toFixed(6)}:${stop.status}`,
      )
      .join("|"),
    depot ? `${depot.label}:${depot.latitude.toFixed(6)},${depot.longitude.toFixed(6)}` : "no-depot",
    geometrySource,
    geometry?.coordinates
      .map((coordinate) => `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}`)
      .join("|") ?? "no-geometry",
  ].join("::");

const getMarkerTheme = (status: string) => {
  switch (normalizeStatus(status)) {
    case "completed":
      return {
        className: "ops-stop-marker ops-stop-marker-completed",
      };
    case "active":
    case "attention_required":
      return {
        className: "ops-stop-marker ops-stop-marker-active",
      };
    default:
      return {
        className: "ops-stop-marker ops-stop-marker-pending",
      };
  }
};

export default function AgentRouteMap({
  stops,
  depot = null,
  routeGeometry,
}: AgentRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const markerIconRef = useRef<Map<string, DivIcon>>(new Map());

  const normalizedStops = useMemo(() => normalizeStops(stops), [stops]);
  const normalizedDepot = useMemo(() => normalizeDepot(depot), [depot]);
  const displayGeometry = useMemo(
    () => routeGeometry?.geometry ?? buildFallbackLineString(normalizedStops, normalizedDepot),
    [normalizedDepot, normalizedStops, routeGeometry],
  );
  const shouldUseStaticPreview = import.meta.env.MODE === "test";
  const routePath = useMemo(() => toLatLngPath(displayGeometry), [displayGeometry]);
  const fitBoundsPoints = useMemo(() => {
    const points = [
      ...routePath,
      ...normalizedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
      ...(normalizedDepot
        ? [[normalizedDepot.latitude, normalizedDepot.longitude] as [number, number]]
        : []),
    ];

    return points.length > 0 ? points : [PARIS_CENTER];
  }, [normalizedDepot, normalizedStops, routePath]);
  const overlaySignature = useMemo(
    () =>
      buildOverlaySignature(
        normalizedStops,
        displayGeometry,
        routeGeometry?.source ?? "fallback",
        normalizedDepot,
      ),
    [displayGeometry, normalizedDepot, normalizedStops, routeGeometry?.source],
  );

  useEffect(() => {
    let isCancelled = false;

    const renderMap = async () => {
      if (shouldUseStaticPreview) {
        return;
      }

      if (!mapContainerRef.current) {
        return;
      }

      const L = leafletModuleRef.current ?? (await import("leaflet"));
      if (isCancelled || !mapContainerRef.current) {
        return;
      }

      leafletModuleRef.current = L;

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        });

        const tileLayer = L.tileLayer(MAP_TILE_URL_TEMPLATE, {
          attribution: MAP_TILE_ATTRIBUTION,
          maxZoom: 19,
          crossOrigin: true,
        });

        tileLayer.addTo(map);
        mapRef.current = map;
        tileLayerRef.current = tileLayer;
      }

      const map = mapRef.current;
      if (!map) {
        return;
      }

      if (overlayLayerRef.current) {
        overlayLayerRef.current.remove();
        overlayLayerRef.current = null;
      }

      const overlayLayer = L.layerGroup();

      if (routePath.length >= 2) {
        const shadowLine = L.polyline(routePath, {
          color: "#081225",
          weight: 8,
          opacity: 0.28,
          lineCap: "round",
          lineJoin: "round",
        });
        const primaryLine = L.polyline(routePath, {
          color: "#2f7bff",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        });

        shadowLine.addTo(overlayLayer);
        primaryLine.addTo(overlayLayer);
      }

      if (normalizedDepot) {
        const depotIconCacheKey = "ops-stop-marker ops-stop-marker-depot:D";
        let depotIcon = markerIconRef.current.get(depotIconCacheKey);
        if (!depotIcon) {
          depotIcon = L.divIcon({
            className: "ops-stop-marker ops-stop-marker-depot",
            html: "<span>D</span>",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          markerIconRef.current.set(depotIconCacheKey, depotIcon);
        }

        L.marker([normalizedDepot.latitude, normalizedDepot.longitude], {
          icon: depotIcon,
        })
          .bindTooltip(`Depot - ${normalizedDepot.label}`, {
            direction: "top",
            offset: [0, -8],
            opacity: 0.95,
          })
          .addTo(overlayLayer);
      }

      normalizedStops.forEach((stop) => {
        const markerTheme = getMarkerTheme(stop.status);
        const iconCacheKey = `${markerTheme.className}:${stop.stopOrder}`;
        let labelIcon = markerIconRef.current.get(iconCacheKey);
        if (!labelIcon) {
          labelIcon = L.divIcon({
            className: markerTheme.className,
            html: `<span>${stop.stopOrder}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          markerIconRef.current.set(iconCacheKey, labelIcon);
        }

        L.marker([stop.latitude, stop.longitude], {
          icon: labelIcon,
        }).bindTooltip(
          `#${stop.stopOrder} ${stop.containerCode} - ${stop.containerLabel}`,
          {
            direction: "top",
            offset: [0, -8],
            opacity: 0.95,
          },
        ).addTo(overlayLayer);
      });

      overlayLayer.addTo(map);
      overlayLayerRef.current = overlayLayer;

      const bounds = L.latLngBounds(fitBoundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [28, 28],
          maxZoom: normalizedStops.length <= 1 ? 16 : 15,
        });
      }
    };

    void renderMap();

    return () => {
      isCancelled = true;
    };
  }, [fitBoundsPoints, normalizedStops.length, overlaySignature, routePath, shouldUseStaticPreview]);

  useEffect(
    () => () => {
      overlayLayerRef.current = null;
      tileLayerRef.current = null;
      markerIconRef.current.clear();
      const existingMap = mapRef.current;
      mapRef.current = null;
      existingMap?.remove();
    },
    [],
  );

  if (shouldUseStaticPreview) {
    return (
      <div className="ops-route-map-shell">
        <div
          className="ops-route-map-leaflet ops-route-map-static"
          role="img"
          aria-label="Leaflet route map with road-snapped geometry"
        >
          <p className="ops-route-map-static-label">
            Leaflet preview is disabled in automated tests. Route rendering is validated in the browser.
          </p>
        </div>

        <div className="ops-route-map-legend" aria-hidden="true">
          <span>Leaflet basemap</span>
          <span>Static test preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-route-map-shell">
      <div
        ref={mapContainerRef}
        className="ops-route-map-leaflet"
        role="img"
        aria-label="Leaflet route map with road-snapped geometry"
      />

      <div className="ops-route-map-legend" aria-hidden="true">
        <span>Leaflet basemap</span>
        <span>
          {routeGeometry?.source === "live"
            ? "Stored road route"
            : routePath.length >= 2
              ? "Stored fallback route"
              : normalizedStops.length > 0
                ? "Route stop map"
                : "Paris focus view"}
        </span>
      </div>
    </div>
  );
}
