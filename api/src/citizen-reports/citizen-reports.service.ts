import { Injectable } from '@nestjs/common';

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
    return this.repository.create(dto);
  }
}
