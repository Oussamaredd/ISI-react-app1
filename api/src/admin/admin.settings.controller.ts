import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminUser } from './admin.decorators.js';
import { AdminGuard } from './admin.guard.js';
import { AdminSettingsService } from './admin.settings.service.js';
import type { AdminUserContext } from './admin.types.js';
import { getRequestMetadata } from './admin.utils.js';
import { DispatchTestNotificationDto } from './dto/dispatch-test-notification.dto.js';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(
    @Inject(AdminSettingsService)
    private readonly settingsService: AdminSettingsService,
    @Inject(AdminAuditService)
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async getSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      return { data: settings };
    } catch (error) {
      console.error('Failed to fetch settings', error);
      throw new InternalServerErrorException('Unable to fetch settings');
    }
  }

  @Put()
  async updateSettings(
    @Body() body: Record<string, unknown>,
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const updated = await this.settingsService.updateSettings(body, adminUser?.id ?? null);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'system_settings_updated',
        resourceType: 'system',
        resourceId: 'settings',
        newValues: body,
        ipAddress,
        userAgent,
      });

      return { data: updated };
    } catch (error) {
      console.error('Failed to update settings', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update settings');
    }
  }

  @Post('notifications/test')
  async dispatchTestNotification(
    @Body() body: DispatchTestNotificationDto,
    @AdminUser() adminUser: AdminUserContext,
  ) {
    try {
      const result = await this.settingsService.dispatchTestNotification(body, adminUser?.id ?? null);
      return { data: result };
    } catch (error) {
      console.error('Failed to dispatch test notification', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to dispatch test notification');
    }
  }
}
