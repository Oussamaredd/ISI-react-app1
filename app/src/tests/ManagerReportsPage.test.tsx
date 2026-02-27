import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useGenerateManagerReport,
  usePlanningReportHistory,
  useRegenerateManagerReport,
} from '../hooks/usePlanning';
import ManagerReportsPage from '../pages/ManagerReportsPage';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/usePlanning', () => ({
  useGenerateManagerReport: vi.fn(),
  usePlanningReportHistory: vi.fn(),
  useRegenerateManagerReport: vi.fn(),
}));

describe('ManagerReportsPage', () => {
  const generateMutateAsync = vi.fn();
  const regenerateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-27T12:00:00.000Z'));
    vi.clearAllMocks();

    vi.mocked(useGenerateManagerReport).mockReturnValue({
      mutateAsync: generateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateManagerReport>);

    vi.mocked(usePlanningReportHistory).mockReturnValue({
      data: {
        reports: [
          {
            id: '615b7ec9-5c15-4bc7-8ea2-4df09764e5e8',
            periodStart: '2026-01-01T00:00:00.000Z',
            periodEnd: '2026-01-31T23:59:59.000Z',
            selectedKpis: ['tours', 'collections'],
            createdAt: '2026-02-01T08:00:00.000Z',
            sendEmail: false,
            emailTo: null,
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof usePlanningReportHistory>);

    vi.mocked(useRegenerateManagerReport).mockReturnValue({
      mutateAsync: regenerateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRegenerateManagerReport>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates and regenerates monthly reports from manager workflow', async () => {
    generateMutateAsync.mockResolvedValueOnce({ id: 'new-report' });
    regenerateMutateAsync.mockResolvedValueOnce({ id: 'regen-report' });

    renderWithProviders(<ManagerReportsPage />, {
      route: '/app/manager/reports',
      withAuthProvider: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Generate PDF Report/i }));

    await waitFor(() => {
      expect(generateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: '2026-01-28T00:00:00.000Z',
          periodEnd: '2026-02-27T23:59:59.000Z',
          selectedKpis: ['tours', 'collections', 'anomalies'],
          sendEmail: false,
          format: 'pdf',
        }),
      );
    });

    expect(await screen.findByText(/Monthly report generated successfully\./i)).toBeInTheDocument();

    const downloadLink = screen.getByRole('link', { name: /Download PDF/i });
    expect(downloadLink).toHaveAttribute(
      'href',
      '/api/planning/reports/615b7ec9-5c15-4bc7-8ea2-4df09764e5e8/download',
    );

    fireEvent.click(screen.getByRole('button', { name: /Regenerate/i }));
    await waitFor(() => {
      expect(regenerateMutateAsync).toHaveBeenCalledWith('615b7ec9-5c15-4bc7-8ea2-4df09764e5e8');
    });
  });
});
