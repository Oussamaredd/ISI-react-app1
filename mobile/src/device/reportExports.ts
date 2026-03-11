import { buildApiUrl, createApiHeaders, createApiRequestError } from "@api/core/http";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { ManagerReportFormat } from "@/features/manager/reporting";

const REPORT_EXPORT_DIRECTORY_NAME = "report-exports";

const REPORT_MIME_TYPES: Record<ManagerReportFormat, string> = {
  pdf: "application/pdf",
  csv: "text/csv"
};

const REPORT_IOS_UTI: Record<ManagerReportFormat, string> = {
  pdf: "com.adobe.pdf",
  csv: "public.comma-separated-values-text"
};

const createHeaderRecord = (headers: Headers) => {
  const normalizedHeaders: Record<string, string> = {};

  headers.forEach((value, key) => {
    normalizedHeaders[key] = value;
  });

  return normalizedHeaders;
};

const resolveDownloadFileName = (
  response: Response,
  reportId: string,
  format: ManagerReportFormat
) => {
  const contentDisposition = response.headers.get("content-disposition");
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const fallbackMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
  const rawFileName = encodedMatch?.[1] ?? fallbackMatch?.[1];

  if (!rawFileName) {
    return `report-${reportId}.${format}`;
  }

  try {
    return decodeURIComponent(rawFileName);
  } catch {
    return rawFileName;
  }
};

const downloadReportForWeb = async (
  reportId: string,
  format: ManagerReportFormat
) => {
  const response = await fetch(buildApiUrl(`/api/planning/reports/${reportId}/download`), {
    headers: createApiHeaders()
  });

  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  const fileName = resolveDownloadFileName(response, reportId, format);
  const reportBlob = await response.blob();
  const objectUrl = window.URL.createObjectURL(reportBlob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);

  return {
    fileName,
    transport: "browser-download" as const
  };
};

export const downloadAndShareManagerReport = async (
  reportId: string,
  format: ManagerReportFormat
) => {
  if (Platform.OS === "web") {
    return downloadReportForWeb(reportId, format);
  }

  const exportDirectory = new Directory(Paths.cache, REPORT_EXPORT_DIRECTORY_NAME);
  exportDirectory.create({ idempotent: true, intermediates: true });

  const fileName = `report-${reportId}.${format}`;
  const targetFile = new File(exportDirectory, fileName);
  const downloadedFile = await File.downloadFileAsync(
    buildApiUrl(`/api/planning/reports/${reportId}/download`),
    targetFile,
    {
      headers: createHeaderRecord(createApiHeaders()),
      idempotent: true
    }
  );

  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(downloadedFile.uri, {
      dialogTitle: "Share EcoTrack report export",
      mimeType: REPORT_MIME_TYPES[format],
      UTI: REPORT_IOS_UTI[format]
    });
  }

  return {
    fileName,
    transport: sharingAvailable ? ("share-sheet" as const) : ("local-file" as const)
  };
};
