import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PermissionsGuard } from '../modules/auth/permissions.guard.js';

const createExecutionContext = (authUser?: { permissions?: string[] }) =>
  ({
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        authUser,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  it('allows requests when no permissions metadata is defined', () => {
    const reflector = {
      getAllAndMerge: vi.fn().mockReturnValue([]),
    };
    const guard = new PermissionsGuard(reflector as any);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('throws UnauthorizedException when permissions are required but auth user is missing', () => {
    const reflector = {
      getAllAndMerge: vi.fn().mockReturnValue(['tickets.read']),
    };
    const guard = new PermissionsGuard(reflector as any);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when the auth user lacks a required permission', () => {
    const reflector = {
      getAllAndMerge: vi.fn().mockReturnValue(['tickets.write']),
    };
    const guard = new PermissionsGuard(reflector as any);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          permissions: ['tickets.read'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('normalizes permission names before evaluating access', () => {
    const reflector = {
      getAllAndMerge: vi.fn().mockReturnValue([' Tickets.Read ']),
    };
    const guard = new PermissionsGuard(reflector as any);

    expect(
      guard.canActivate(
        createExecutionContext({
          permissions: ['tickets.read'],
        }),
      ),
    ).toBe(true);
  });
});
