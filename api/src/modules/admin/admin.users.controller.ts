import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import bcryptPkg from 'bcryptjs';
import { isEmail } from 'class-validator';
import type { Request } from 'express';

import { USERS_ADMIN_PORT, type UsersAdminPort } from '../users/users.contract.js';

import { AdminAuditService } from './admin.audit.service.js';
import { AdminUser } from './admin.decorators.js';
import { AdminGuard } from './admin.guard.js';
import type { AdminUserContext } from './admin.types.js';
import { getRequestMetadata } from './admin.utils.js';

const { hash } = bcryptPkg as unknown as {
  hash: (plaintext: string, rounds: number) => Promise<string>;
};

const parseOptionalBooleanQuery = (value: string | undefined, fieldName: string) => {
  if (value == null) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw new BadRequestException(`${fieldName} must be "true" or "false"`);
};

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

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(
    @Inject(USERS_ADMIN_PORT)
    private readonly usersService: UsersAdminPort,
    @Inject(AdminAuditService)
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('is_active') isActiveParam?: string,
    @Query('auth_provider') authProvider?: string,
    @Query('created_from') createdFromParam?: string,
    @Query('created_to') createdToParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    try {
      const isActive = parseOptionalBooleanQuery(isActiveParam, 'is_active');
      const createdFrom = parseOptionalDateQuery(createdFromParam, 'created_from');
      const createdTo = parseOptionalDateQuery(createdToParam, 'created_to');
      if (createdTo) {
        createdTo.setHours(23, 59, 59, 999);
      }
      const page = Number.parseInt(pageParam ?? '', 10);
      const limit = Number.parseInt(limitParam ?? '', 10);

      const result = await this.usersService.listUsers({
        search,
        role,
        isActive,
        authProvider,
        createdFrom,
        createdTo,
        page: Number.isFinite(page) ? page : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return { data: result };
    } catch (error) {
      console.error('Failed to list users', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to fetch users');
    }
  }

  @Post()
  @HttpCode(201)
  async createUser(
    @Body()
    body: {
      email?: string;
      displayName?: string;
      password?: string;
      roleIds?: string[];
      role_ids?: string[];
      isActive?: boolean;
      is_active?: boolean;
    },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const email = body.email?.trim().toLowerCase() ?? '';
      const password = body.password?.trim() ?? '';
      const displayName = body.displayName?.trim() || undefined;
      const roleIds = Array.isArray(body.roleIds)
        ? body.roleIds
        : Array.isArray(body.role_ids)
          ? body.role_ids
          : [];

      const rawIsActive = body.isActive ?? body.is_active;
      const isActive = typeof rawIsActive === 'boolean' ? rawIsActive : true;

      if (!email || !isEmail(email)) {
        throw new BadRequestException('A valid email is required.');
      }

      if (!password || password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long.');
      }

      if (!Array.isArray(roleIds) || roleIds.length === 0) {
        throw new BadRequestException('At least one initial role is required.');
      }

      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('Email is already in use.');
      }

      const passwordHash = await hash(password, 10);
      const createdUser = await this.usersService.createLocalUser({
        email,
        displayName,
        passwordHash,
        roleIds,
        isActive,
      });

      if (!createdUser) {
        throw new InternalServerErrorException('Unable to create user');
      }

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'user_created',
        resourceType: 'users',
        resourceId: createdUser.id,
        newValues: {
          email: createdUser.email,
          display_name: createdUser.displayName,
          is_active: createdUser.isActive,
          role_ids: roleIds,
        },
        ipAddress,
        userAgent,
      });

      return { data: createdUser };
    } catch (error) {
      console.error('Failed to create user', error);
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Unable to create user');
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

