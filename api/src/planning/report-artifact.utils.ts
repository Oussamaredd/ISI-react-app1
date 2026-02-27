export type ReportFormat = 'pdf' | 'csv';

export type ReportMetrics = {
  tours: number;
  collections: number;
  anomalies: number;
};

export type ReportPayload = {
  periodStart: string;
  periodEnd: string;
  selectedKpis: string[];
  metrics: ReportMetrics;
  generatedAt: string;
};

type ReportDownloadMeta = {
  contentType: string;
  fileExtension: string;
};

type ReportArtifact = {
  format: ReportFormat;
  contentType: string;
  fileExtension: string;
  encodedContent: string;
};

const DEFAULT_REPORT_FORMAT: ReportFormat = 'pdf';
const MAX_PDF_LINES = 44;

const REPORT_DOWNLOAD_META: Record<ReportFormat, ReportDownloadMeta> = {
  pdf: {
    contentType: 'application/pdf',
    fileExtension: 'pdf',
  },
  csv: {
    contentType: 'text/csv; charset=utf-8',
    fileExtension: 'csv',
  },
};

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeReportFormat = (rawFormat?: string | null): ReportFormat => {
  const normalized = rawFormat?.trim().toLowerCase();

  if (normalized === 'csv' || normalized === 'excel' || normalized === 'xlsx') {
    return 'csv';
  }

  if (normalized === 'pdf') {
    return 'pdf';
  }

  return DEFAULT_REPORT_FORMAT;
};

export const resolveReportDownloadMeta = (rawFormat?: string | null): ReportDownloadMeta => {
  const format = normalizeReportFormat(rawFormat);
  return REPORT_DOWNLOAD_META[format];
};

const escapeCsvValue = (value: string) => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const buildCsvReport = (payload: ReportPayload): Buffer => {
  const lines = [
    ['report_name', 'EcoTrack Monthly Operational Report'],
    ['generated_at', payload.generatedAt],
    ['period_start', payload.periodStart],
    ['period_end', payload.periodEnd],
    ['selected_kpis', payload.selectedKpis.join(';')],
    ['tours', String(toFiniteNumber(payload.metrics.tours))],
    ['collections', String(toFiniteNumber(payload.metrics.collections))],
    ['anomalies', String(toFiniteNumber(payload.metrics.anomalies))],
  ];

  const csv = ['metric,value', ...lines.map((row) => row.map(escapeCsvValue).join(','))].join('\n');
  return Buffer.from(csv, 'utf8');
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildPdfSummaryLines = (payload: ReportPayload): string[] => {
  const lines = [
    'EcoTrack Monthly Operational Report',
    `Generated at: ${payload.generatedAt}`,
    `Period start: ${payload.periodStart}`,
    `Period end: ${payload.periodEnd}`,
    `Selected KPIs: ${payload.selectedKpis.join(', ') || 'none'}`,
    '',
    `Tours: ${toFiniteNumber(payload.metrics.tours)}`,
    `Collections: ${toFiniteNumber(payload.metrics.collections)}`,
    `Anomalies: ${toFiniteNumber(payload.metrics.anomalies)}`,
  ];

  if (lines.length <= MAX_PDF_LINES) {
    return lines;
  }

  const truncated = lines.slice(0, MAX_PDF_LINES - 1);
  truncated.push('... truncated');
  return truncated;
};

const buildPdfDocument = (summaryLines: string[]): Buffer => {
  const commands = ['BT', '/F1 12 Tf', '48 760 Td'];

  for (let index = 0; index < summaryLines.length; index += 1) {
    if (index > 0) {
      commands.push('0 -14 Td');
    }

    commands.push(`(${escapePdfText(summaryLines[index])}) Tj`);
  }

  commands.push('ET');
  const contentStream = commands.join('\n');
  const contentLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`,
  ];

  let output = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(output, 'utf8'));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(output, 'utf8');
};

const buildReportBuffer = (payload: ReportPayload, format: ReportFormat): Buffer => {
  if (format === 'csv') {
    return buildCsvReport(payload);
  }

  return buildPdfDocument(buildPdfSummaryLines(payload));
};

export const createReportArtifact = (payload: ReportPayload, rawFormat?: string | null): ReportArtifact => {
  const format = normalizeReportFormat(rawFormat);
  const buffer = buildReportBuffer(payload, format);
  const metadata = resolveReportDownloadMeta(format);

  return {
    format,
    contentType: metadata.contentType,
    fileExtension: metadata.fileExtension,
    encodedContent: buffer.toString('base64'),
  };
};

const isLikelyBase64 = (value: string) => {
  const compact = value.replace(/\s+/g, '');
  if (compact.length === 0 || compact.length % 4 !== 0) {
    return false;
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) {
    return false;
  }

  const decoded = Buffer.from(compact, 'base64');
  if (decoded.length === 0) {
    return false;
  }

  const normalizedInput = compact.replace(/=+$/, '');
  const normalizedDecoded = decoded.toString('base64').replace(/=+$/, '');
  return normalizedDecoded === normalizedInput;
};

export const decodeStoredReportContent = (storedContent: string): Buffer => {
  if (isLikelyBase64(storedContent)) {
    return Buffer.from(storedContent.replace(/\s+/g, ''), 'base64');
  }

  return Buffer.from(storedContent, 'utf8');
};
