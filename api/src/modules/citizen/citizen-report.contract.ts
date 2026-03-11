export const CITIZEN_REPORT_TYPES = [
  'container_full',
  'damaged_container',
  'access_blocked',
  'general_issue',
] as const;

export type CitizenReportType = (typeof CITIZEN_REPORT_TYPES)[number];

export const DEFAULT_CITIZEN_REPORT_TYPE: CitizenReportType = 'general_issue';

const DESCRIPTION_PREFIX_PATTERN = /^\[(container_full|damaged_container|access_blocked|general_issue)\]\s*/i;

const REPORT_TYPE_LABELS: Record<CitizenReportType, string> = {
  container_full: 'Container full',
  damaged_container: 'Damaged container',
  access_blocked: 'Access blocked',
  general_issue: 'General issue',
};

export const normalizeCitizenReportType = (value?: string | null): CitizenReportType => {
  if (typeof value !== 'string') {
    return DEFAULT_CITIZEN_REPORT_TYPE;
  }

  const normalized = value.trim().toLowerCase();
  return CITIZEN_REPORT_TYPES.includes(normalized as CitizenReportType)
    ? (normalized as CitizenReportType)
    : DEFAULT_CITIZEN_REPORT_TYPE;
};

export const formatCitizenReportTypeLabel = (value?: string | null) =>
  REPORT_TYPE_LABELS[normalizeCitizenReportType(value)];

export const formatStoredCitizenReportDescription = (
  reportType: CitizenReportType,
  description: string,
) => `[${reportType}] ${description.trim()}`;

export const parseStoredCitizenReportDescription = (value?: string | null) => {
  if (typeof value !== 'string') {
    return {
      reportType: DEFAULT_CITIZEN_REPORT_TYPE,
      description: '',
    };
  }

  const normalized = value.trim();
  const match = normalized.match(DESCRIPTION_PREFIX_PATTERN);

  if (!match) {
    return {
      reportType: DEFAULT_CITIZEN_REPORT_TYPE,
      description: normalized,
    };
  }

  return {
    reportType: normalizeCitizenReportType(match[1]),
    description: normalized.replace(DESCRIPTION_PREFIX_PATTERN, '').trim(),
  };
};
