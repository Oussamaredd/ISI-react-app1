export type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
};

export const captureCameraPhoto = async (): Promise<CapturedPhoto | null> => {
  const imagePicker = await import("expo-image-picker");
  const permission = await imagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Camera access was not granted.");
  }

  const result = await imagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.35,
    base64: true,
    exif: false,
    cameraType: imagePicker.CameraType.back
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    base64: asset.base64 ?? null
  };
};

export const resolvePhotoPreviewAspectRatio = (
  photo?: Pick<CapturedPhoto, "width" | "height"> | null
) => {
  if (!photo || photo.width <= 0 || photo.height <= 0) {
    return 1;
  }

  const ratio = photo.width / photo.height;
  return Math.min(Math.max(ratio, 0.7), 1.8);
};
