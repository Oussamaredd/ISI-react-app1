import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminGuard } from './admin.guard.js';

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  async listLogs(
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('resource_type') resourceType?: string,
    @Query('user_id') userId?: string,
    @Query('date_from') dateFromParam?: string,
    @Query('date_to') dateToParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    try {
      const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
      const dateTo = dateToParam ? new Date(dateToParam) : undefined;

      const page = Number.parseInt(pageParam ?? '', 10);
      const limit = Number.parseInt(limitParam ?? '', 10);

      const result = await this.auditService.listLogs({
        search,
        action,
        resourceType,
        userId,
        dateFrom: dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : undefined,
        dateTo: dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : undefined,
        page: Number.isFinite(page) ? page : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return { data: result };
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      throw new InternalServerErrorException('Unable to fetch audit logs');
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.auditService.getStats();
      return { data: stats };
    } catch (error) {
      console.error('Failed to fetch audit stats', error);
      throw new InternalServerErrorException('Unable to fetch audit stats');
    }
  }
}
