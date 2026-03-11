export type CapturedLocation = {
  latitude: string;
  longitude: string;
};

export const captureCurrentLocation = async (): Promise<CapturedLocation> => {
  const location = await import("expo-location");
  const permission = await location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Location access was not granted.");
  }

  const position = await location.getCurrentPositionAsync({
    accuracy: location.Accuracy.High
  });

  return {
    latitude: position.coords.latitude.toFixed(6),
    longitude: position.coords.longitude.toFixed(6)
  };
};

export const captureCurrentLocationIfAvailable = async (): Promise<CapturedLocation | null> => {
  try {
    return await captureCurrentLocation();
  } catch {
    return null;
  }
};
