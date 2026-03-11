type CoordinateLike = {
  latitude?: string | null;
  longitude?: string | null;
};

type IdentifiedCoordinateLike = CoordinateLike & {
  id: string;
};

export type NearbyMatch<T extends IdentifiedCoordinateLike> = T & {
  distanceMeters: number;
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

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;
