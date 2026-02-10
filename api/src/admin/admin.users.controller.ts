import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from './admin.guard.js';
import { AdminUser } from './admin.decorators.js';
import type { AdminUserContext } from './admin.types.js';
import { UsersService } from '../users/users.service.js';
import { AdminAuditService } from './admin.audit.service.js';
import { getRequestMetadata } from './admin.utils.js';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('is_active') isActiveParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    try {
      const isActive =
        isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;
      const page = Number.parseInt(pageParam ?? '', 10);
      const limit = Number.parseInt(limitParam ?? '', 10);

      const result = await this.usersService.listUsers({
        search,
        role,
        isActive,
        page: Number.isFinite(page) ? page : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return { data: result };
    } catch (error) {
      console.error('Failed to list users', error);
      throw new InternalServerErrorException('Unable to fetch users');
    }
  }

  @Get(':id')
  async getUser(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const user = await this.usersService.getUserWithRoles(id);
      return { data: user };
    } catch (error) {
      console.error('Failed to fetch user', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to fetch user');
    }
  }

  @Put(':id/roles')
  @HttpCode(200)
  async updateUserRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { roleIds?: string[]; role_ids?: string[] },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const roleIds = Array.isArray(body?.roleIds)
        ? body.roleIds
        : Array.isArray(body?.role_ids)
          ? body.role_ids
          : [];

      const before = await this.usersService.getUserWithRoles(id);
      const updated = await this.usersService.updateUserRoles(id, roleIds);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'user_updated',
        resourceType: 'users',
        resourceId: id,
        oldValues: { roles: before.roles },
        newValues: { roles: updated.roles },
        ipAddress,
        userAgent,
      });

      return { data: updated };
    } catch (error) {
      console.error('Failed to update user roles', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update user roles');
    }
  }

  @Put(':id/status')
  @HttpCode(200)
  async updateUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { is_active?: boolean; isActive?: boolean },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const rawStatus = body?.is_active ?? body?.isActive;
      let isActive: boolean | undefined;
      if (typeof rawStatus === 'boolean') {
        isActive = rawStatus;
      } else if (typeof rawStatus === 'string') {
        if (rawStatus === 'true') isActive = true;
        if (rawStatus === 'false') isActive = false;
      }

      if (typeof isActive !== 'boolean') {
        throw new BadRequestException('Invalid status payload');
      }

      const before = await this.usersService.getUserWithRoles(id);
      const updated = await this.usersService.updateUserStatus(id, isActive);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: isActive ? 'user_activated' : 'user_deactivated',
        resourceType: 'users',
        resourceId: id,
        oldValues: { is_active: before.isActive },
        newValues: { is_active: updated.isActive },
        ipAddress,
        userAgent,
      });

      return { data: updated };
    } catch (error) {
      console.error('Failed to update user status', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update user status');
    }
  }
}
