import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuditLogs } from '../components/admin/AuditLogs';
import { renderWithProviders } from './test-utils';

const mockUseAuditLogs = vi.fn();
const mockUseAuditStats = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../hooks/adminHooks', () => ({
  useAuditLogs: (filters: unknown) => mockUseAuditLogs(filters),
  useAuditStats: () => mockUseAuditStats(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

describe('AuditLogs', () => {
  beforeEach(() => {
    mockAddToast.mockReset();
    mockUseAuditStats.mockReturnValue({ data: [] });
  });

  it('shows info toast when export is triggered with no logs', async () => {
    mockUseAuditLogs.mockReturnValue({
      data: { logs: [], total: 0, totalPages: 1, page: 1, pageSize: 50 },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<AuditLogs />, {
      route: '/app/admin',
      withAuthProvider: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(mockAddToast).toHaveBeenCalledWith(
      'No logs available for export with the current filters.',
      'info',
    );
  });

  it('exports csv and shows success toast when logs exist', async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob://audit-log-file');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    mockUseAuditLogs.mockReturnValue({
      data: {
        logs: [
          {
            id: 'log-1',
            user_id: 'user-1',
            user_name: 'Admin User',
            action: 'user_created',
            resource_type: 'users',
            resource_id: 'user-2',
            old_values: null,
            new_values: { role: 'agent' },
            ip_address: '127.0.0.1',
            user_agent: 'vitest',
            created_at: '2026-02-23T10:00:00.000Z',
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: 50,
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<AuditLogs />, {
      route: '/app/admin',
      withAuthProvider: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Exported 1 audit log entries as CSV.', 'success');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
