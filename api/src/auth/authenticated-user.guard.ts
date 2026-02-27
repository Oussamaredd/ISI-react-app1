import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { UsersService } from '../users/users.service.js';

import { AuthService } from './auth.service.js';
import type { RequestWithAuthUser } from './authorization.types.js';

const normalizePermission = (value: string) => value.trim().toLowerCase();

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authUser = this.authService.getAuthUserFromRequest(request);

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

    const dbRoles = await this.usersService.getRolesForUser(dbUser.id);
    const permissions = new Set<string>();

    for (const role of dbRoles) {
      if (Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          if (typeof permission === 'string' && permission.trim().length > 0) {
            permissions.add(normalizePermission(permission));
          }
        }
      }
    }

    request.authUser = {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
      roles: dbRoles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
      permissions: Array.from(permissions),
      isActive: dbUser.isActive,
    };

    return true;
  }
}
