import { Injectable } from '@nestjs/common';

import { withActiveSpan } from '../../observability/tracing.helpers.js';

import { CitizenReportsRepository } from './citizen-reports.repository.js';
import type { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';

type CitizenReportListFilters = {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class CitizenReportsService {
  constructor(private readonly repository: CitizenReportsRepository) {}

  async list(filters: CitizenReportListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateCitizenReportDto) {
    return withActiveSpan(
      'citizen.report.create',
      () => this.repository.create(dto),
      {
        attributes: {
          'report.container_id': dto.containerId ?? 'unassigned',
          'report.reporter_user_id': dto.reporterUserId ?? 'anonymous',
          'report.has_location': Boolean(dto.latitude && dto.longitude),
          'report.has_photo': Boolean(dto.photoUrl),
        },
      },
    );
  }
}

