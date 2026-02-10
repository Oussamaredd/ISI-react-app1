import { Injectable } from '@nestjs/common';
import { AdminAuditRepository } from './admin.audit.repository.js';

type AuditLogInput = {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditLogFilters = {
  search?: string;
  action?: string;
  resourceType?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
};

@Injectable()
export class AdminAuditService {
  constructor(private readonly adminAuditRepository: AdminAuditRepository) {}

  async log(entry: AuditLogInput) {
    await this.adminAuditRepository.log(entry);
  }

  async listLogs(filters: AuditLogFilters = {}) {
    return this.adminAuditRepository.listLogs(filters);
  }

  async getStats(limit = 50) {
    return this.adminAuditRepository.getStats(limit);
  }
}
