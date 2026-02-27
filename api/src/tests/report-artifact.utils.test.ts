import { describe, expect, it } from 'vitest';

import {
  createReportArtifact,
  decodeStoredReportContent,
  normalizeReportFormat,
  resolveReportDownloadMeta,
  type ReportPayload,
} from '../planning/report-artifact.utils.js';

const payload: ReportPayload = {
  periodStart: '2026-02-01T00:00:00.000Z',
  periodEnd: '2026-02-28T23:59:59.000Z',
  selectedKpis: ['tours', 'collections', 'anomalies'],
  metrics: {
    tours: 18,
    collections: 112,
    anomalies: 7,
  },
  generatedAt: '2026-02-27T10:00:00.000Z',
};

describe('report artifact utils', () => {
  it('normalizes report formats with safe defaults', () => {
    expect(normalizeReportFormat('pdf')).toBe('pdf');
    expect(normalizeReportFormat('csv')).toBe('csv');
    expect(normalizeReportFormat('xlsx')).toBe('csv');
    expect(normalizeReportFormat('unexpected')).toBe('pdf');
  });

  it('creates a valid PDF artifact payload', () => {
    const artifact = createReportArtifact(payload, 'pdf');
    const decoded = decodeStoredReportContent(artifact.encodedContent);

    expect(artifact.format).toBe('pdf');
    expect(artifact.contentType).toBe('application/pdf');
    expect(decoded.toString('utf8').startsWith('%PDF-')).toBe(true);
  });

  it('creates an excel-compatible CSV artifact payload', () => {
    const artifact = createReportArtifact(payload, 'csv');
    const decoded = decodeStoredReportContent(artifact.encodedContent).toString('utf8');

    expect(artifact.format).toBe('csv');
    expect(artifact.fileExtension).toBe('csv');
    expect(decoded).toContain('metric,value');
    expect(decoded).toContain('tours,18');
  });

  it('falls back to legacy plain-text decoding when content is not base64', () => {
    const decoded = decodeStoredReportContent('legacy plain text');
    expect(decoded.toString('utf8')).toBe('legacy plain text');
  });

  it('resolves download metadata from persisted format', () => {
    expect(resolveReportDownloadMeta('pdf')).toEqual({
      contentType: 'application/pdf',
      fileExtension: 'pdf',
    });
    expect(resolveReportDownloadMeta('csv')).toEqual({
      contentType: 'text/csv; charset=utf-8',
      fileExtension: 'csv',
    });
  });
});
