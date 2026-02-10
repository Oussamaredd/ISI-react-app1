import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { UsersService } from '../users/users.service.js';
import type { AdminUserContext } from './admin.types.js';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminUserContext }>();

    const authUser = this.authService.getAuthUserFromCookie(request.headers.cookie);
    if (!authUser) {
      throw new UnauthorizedException();
    }

    const dbUser = await this.usersService.ensureUserForAuth(authUser);
    if (!dbUser) {
      throw new UnauthorizedException();
    }

    if (dbUser.isActive === false) {
      throw new ForbiddenException('User account is inactive');
    }

    const roles = await this.usersService.getRolesForUser(dbUser.id);
    const roleNames = new Set([dbUser.role, ...roles.map((role) => role.name)]);
    const isAdmin = Array.from(roleNames).some((role) => ADMIN_ROLE_NAMES.has(role));

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    request.adminUser = {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
      roles: roles.map((role) => ({ id: role.id, name: role.name })),
      isActive: dbUser.isActive,
    };

    return true;
  }
}
