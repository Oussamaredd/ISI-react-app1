import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestWithAuthUser } from './authorization.types.js';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator.js';

const normalizePermission = (value: string) => value.trim().toLowerCase();

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions =
      this.reflector.getAllAndMerge<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getClass(),
        context.getHandler(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authUser = request.authUser;

    if (!authUser) {
      throw new UnauthorizedException();
    }

    const userPermissions = new Set(
      (authUser.permissions ?? []).map((permission) => normalizePermission(permission)),
    );

    const missingPermissions = requiredPermissions.filter(
      (permission) => !userPermissions.has(normalizePermission(permission)),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
