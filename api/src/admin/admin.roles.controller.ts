import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminUser } from './admin.decorators.js';
import { AdminGuard } from './admin.guard.js';
import { AdminRolesService } from './admin.roles.service.js';
import type { AdminUserContext } from './admin.types.js';
import { getRequestMetadata } from './admin.utils.js';

@Controller('admin/roles')
@UseGuards(AdminGuard)
export class AdminRolesController {
  constructor(
    private readonly rolesService: AdminRolesService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async listRoles() {
    try {
      const roles = await this.rolesService.listRoles();
      return { data: roles };
    } catch (error) {
      console.error('Failed to list roles', error);
      throw new InternalServerErrorException('Unable to fetch roles');
    }
  }

  @Get('permissions')
  getPermissions() {
    return { data: this.rolesService.getAvailablePermissions() };
  }

  @Post()
  async createRole(
    @Body() body: { name: string; description?: string; permissions?: string[] },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const created = await this.rolesService.createRole(body);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'role_created',
        resourceType: 'roles',
        resourceId: created.id,
        newValues: created,
        ipAddress,
        userAgent,
      });

      return { data: created };
    } catch (error) {
      console.error('Failed to create role', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to create role');
    }
  }

  @Put(':id')
  async updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { name?: string; description?: string; permissions?: string[] },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const updated = await this.rolesService.updateRole(id, body);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'role_updated',
        resourceType: 'roles',
        resourceId: id,
        newValues: updated,
        ipAddress,
        userAgent,
      });

      return { data: updated };
    } catch (error) {
      console.error('Failed to update role', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update role');
    }
  }

  @Delete(':id')
  async deleteRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const deleted = await this.rolesService.deleteRole(id);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'role_deleted',
        resourceType: 'roles',
        resourceId: id,
        oldValues: deleted,
        ipAddress,
        userAgent,
      });

      return { data: deleted };
    } catch (error) {
      console.error('Failed to delete role', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to delete role');
    }
  }
}
