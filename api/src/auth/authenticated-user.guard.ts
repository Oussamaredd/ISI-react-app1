import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import type { RequestWithAuthUser } from './authorization.types.js';

const ALL_PLATFORM_PERMISSIONS = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'hotels.read',
  'hotels.write',
  'tickets.read',
  'tickets.write',
  'audit.read',
  'settings.write',
];

const FALLBACK_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PLATFORM_PERMISSIONS,
  admin: ALL_PLATFORM_PERMISSIONS,
  manager: ['users.read', 'hotels.read', 'tickets.read', 'audit.read'],
  agent: ['tickets.read', 'tickets.write'],
  user: ['tickets.read', 'tickets.write'],
};

const normalizeRole = (value: string) => value.trim().toLowerCase();
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

    const dbRoles = await this.usersService.getRolesForUser(dbUser.id);

    const roleNames = new Set<string>();
    const permissions = new Set<string>();

    if (dbUser.role) {
      roleNames.add(normalizeRole(dbUser.role));
    }

    for (const role of dbRoles) {
      const roleName = role.name?.trim();
      if (roleName) {
        roleNames.add(normalizeRole(roleName));
      }

      if (Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          if (typeof permission === 'string' && permission.trim().length > 0) {
            permissions.add(normalizePermission(permission));
          }
        }
      }
    }

    for (const roleName of roleNames) {
      const fallbackPermissions = FALLBACK_ROLE_PERMISSIONS[roleName] ?? [];
      for (const permission of fallbackPermissions) {
        permissions.add(normalizePermission(permission));
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
      hotelId: dbUser.hotelId,
    };

    return true;
  }
}
