import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminUserContext } from './admin.types.js';

export const AdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUserContext | undefined => {
    const request = ctx.switchToHttp().getRequest<{ adminUser?: AdminUserContext }>();
    return request.adminUser;
  },
);
