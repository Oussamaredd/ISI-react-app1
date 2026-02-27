import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminGuard } from './admin.guard.js';

const parseOptionalDateQuery = (value: string | undefined, fieldName: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }

  return parsed;
};

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
export class AdminAuditController {
  constructor(@Inject(AdminAuditService) private readonly auditService: AdminAuditService) {}

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
      const dateFrom = parseOptionalDateQuery(dateFromParam, 'date_from');
      const dateTo = parseOptionalDateQuery(dateToParam, 'date_to');
      if (dateTo) {
        dateTo.setHours(23, 59, 59, 999);
      }

      const page = Number.parseInt(pageParam ?? '', 10);
      const limit = Number.parseInt(limitParam ?? '', 10);

      const result = await this.auditService.listLogs({
        search,
        action,
        resourceType,
        userId,
        dateFrom,
        dateTo,
        page: Number.isFinite(page) ? page : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return { data: result };
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
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
