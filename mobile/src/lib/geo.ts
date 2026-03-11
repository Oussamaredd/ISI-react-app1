type CoordinateLike = {
  latitude?: string | null;
  longitude?: string | null;
};

type IdentifiedCoordinateLike = CoordinateLike & {
  id: string;
};

export type ViewportRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type NearbyMatch<T extends IdentifiedCoordinateLike> = T & {
  distanceMeters: number;
};

export type ViewportCluster<T> = {
  items: T[];
  primaryItem: T;
  leftPercent: number;
  topPercent: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

export const toCoordinateNumber = (value?: string | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const haversineDistanceMeters = (
  origin: CoordinateLike,
  target: CoordinateLike
) => {
  const originLatitude = toCoordinateNumber(origin.latitude);
  const originLongitude = toCoordinateNumber(origin.longitude);
  const targetLatitude = toCoordinateNumber(target.latitude);
  const targetLongitude = toCoordinateNumber(target.longitude);

  if (
    originLatitude == null ||
    originLongitude == null ||
    targetLatitude == null ||
    targetLongitude == null
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudeDelta = toRadians(targetLatitude - originLatitude);
  const longitudeDelta = toRadians(targetLongitude - originLongitude);
  const latitudeOne = toRadians(originLatitude);
  const latitudeTwo = toRadians(targetLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const rankContainersByDistance = <T extends IdentifiedCoordinateLike>(
  origin: CoordinateLike,
  containers: T[],
  limit = 3
): NearbyMatch<T>[] => {
  return containers
    .map((container) => ({
      ...container,
      distanceMeters: haversineDistanceMeters(origin, container)
    }))
    .filter((container) => Number.isFinite(container.distanceMeters))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
};

export const bearingDegrees = (origin: CoordinateLike, target: CoordinateLike) => {
  const originLatitude = toCoordinateNumber(origin.latitude);
  const originLongitude = toCoordinateNumber(origin.longitude);
  const targetLatitude = toCoordinateNumber(target.latitude);
  const targetLongitude = toCoordinateNumber(target.longitude);

  if (
    originLatitude == null ||
    originLongitude == null ||
    targetLatitude == null ||
    targetLongitude == null
  ) {
    return null;
  }

  const latitudeOne = toRadians(originLatitude);
  const latitudeTwo = toRadians(targetLatitude);
  const longitudeDelta = toRadians(targetLongitude - originLongitude);
  const y = Math.sin(longitudeDelta) * Math.cos(latitudeTwo);
  const x =
    Math.cos(latitudeOne) * Math.sin(latitudeTwo) -
    Math.sin(latitudeOne) * Math.cos(latitudeTwo) * Math.cos(longitudeDelta);
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

  return Number.isFinite(bearing) ? bearing : null;
};

export const projectCoordinateToViewport = (
  region: ViewportRegion,
  target: CoordinateLike,
  paddingPercent?: {
    horizontal?: number;
    vertical?: number;
  }
) => {
  const targetLatitude = toCoordinateNumber(target.latitude);
  const targetLongitude = toCoordinateNumber(target.longitude);

  if (
    targetLatitude == null ||
    targetLongitude == null ||
    !Number.isFinite(region.latitudeDelta) ||
    !Number.isFinite(region.longitudeDelta) ||
    region.latitudeDelta <= 0 ||
    region.longitudeDelta <= 0
  ) {
    return null;
  }

  const horizontalPadding = paddingPercent?.horizontal ?? 12;
  const verticalPadding = paddingPercent?.vertical ?? 14;
  const north = region.latitude + region.latitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const rawLeftPercent = ((targetLongitude - west) / (east - west)) * 100;
  const rawTopPercent = ((north - targetLatitude) / (north - south)) * 100;

  return {
    rawLeftPercent,
    rawTopPercent,
    leftPercent: clamp(rawLeftPercent, horizontalPadding, 100 - horizontalPadding),
    topPercent: clamp(rawTopPercent, verticalPadding, 100 - verticalPadding),
    isVisible:
      rawLeftPercent >= 0 &&
      rawLeftPercent <= 100 &&
      rawTopPercent >= 0 &&
      rawTopPercent <= 100
  };
};

export const clusterViewportTargets = <
  T extends {
    leftPercent: number;
    topPercent: number;
    distanceMeters: number;
  }
>(
  targets: T[],
  thresholdPercent = 8
): ViewportCluster<T>[] => {
  const sortedTargets = [...targets].sort((left, right) => left.distanceMeters - right.distanceMeters);
  const clusters: {
    items: T[];
    primaryItem: T;
    averageLeftPercent: number;
    averageTopPercent: number;
  }[] = [];

  for (const target of sortedTargets) {
    let bestClusterIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    clusters.forEach((cluster, index) => {
      const distance = Math.hypot(
        target.leftPercent - cluster.averageLeftPercent,
        target.topPercent - cluster.averageTopPercent
      );

      if (distance <= thresholdPercent && distance < bestDistance) {
        bestClusterIndex = index;
        bestDistance = distance;
      }
    });

    if (bestClusterIndex === -1) {
      clusters.push({
        items: [target],
        primaryItem: target,
        averageLeftPercent: target.leftPercent,
        averageTopPercent: target.topPercent
      });
      continue;
    }

    const cluster = clusters[bestClusterIndex];
    const nextCount = cluster.items.length + 1;
    cluster.items.push(target);
    cluster.averageLeftPercent =
      (cluster.averageLeftPercent * (nextCount - 1) + target.leftPercent) / nextCount;
    cluster.averageTopPercent =
      (cluster.averageTopPercent * (nextCount - 1) + target.topPercent) / nextCount;

    if (target.distanceMeters < cluster.primaryItem.distanceMeters) {
      cluster.primaryItem = target;
    }
  }

  return clusters.map((cluster) => ({
    items: cluster.items,
    primaryItem: cluster.primaryItem,
    leftPercent: cluster.averageLeftPercent,
    topPercent: cluster.averageTopPercent
  }));
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);
