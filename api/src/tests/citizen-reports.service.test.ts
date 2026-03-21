import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CitizenReportsService } from '../modules/reports/citizen-reports.service.js';

describe('CitizenReportsService', () => {
  const repositoryMock = {
    list: vi.fn(),
    create: vi.fn(),
  };

  let service: CitizenReportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CitizenReportsService(repositoryMock as any);
  });

  it('delegates list filters to the repository', async () => {
    repositoryMock.list.mockResolvedValueOnce({ items: [], total: 0 });

    await expect(
      service.list({
        search: 'overflow',
        status: 'submitted',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual({ items: [], total: 0 });

    expect(repositoryMock.list).toHaveBeenCalledWith({
      search: 'overflow',
      status: 'submitted',
      limit: 20,
      offset: 0,
    });
  });

  it('creates citizen reports through the traced repository call', async () => {
    const dto = {
      reporterUserId: 'user-1',
      containerId: 'container-1',
      title: 'Overflowing bin',
      description: 'Needs pickup',
      latitude: 48.8566,
      longitude: 2.3522,
      photoUrl: 'https://cdn.example.com/report.jpg',
    };
    repositoryMock.create.mockResolvedValueOnce({ id: 'report-1' });

    await expect(service.create(dto as any)).resolves.toEqual({ id: 'report-1' });
    expect(repositoryMock.create).toHaveBeenCalledWith(dto);
  });
});
