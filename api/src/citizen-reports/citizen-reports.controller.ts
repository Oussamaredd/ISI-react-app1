import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';

import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { CitizenReportsService } from './citizen-reports.service.js';
import { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';

@Controller('citizen-reports')
export class CitizenReportsController {
  constructor(@Inject(CitizenReportsService) private readonly reportsService: CitizenReportsService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);

    const { items, total } = await this.reportsService.list({
      search: normalizeSearchTerm(q),
      status: normalizeSearchTerm(status),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      citizenReports: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateCitizenReportDto) {
    return this.reportsService.create(dto);
  }
}
