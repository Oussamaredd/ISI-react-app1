import { Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { UsersService } from '../users/users.service.js';

import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('status')
  async getStatus(@Req() req: Request) {
    const user = this.authService.getAuthUserFromCookie(req.headers.cookie);

    if (!user) {
      return { authenticated: false };
    }

    const enriched = await this.buildUserResponse(user);
    return { authenticated: true, user: enriched };
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const user = this.authService.getAuthUserFromCookie(req.headers.cookie);
    if (!user) {
      throw new UnauthorizedException();
    }

    const enriched = await this.buildUserResponse(user);
    return { user: enriched };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.redirect(this.authService.getAuthRedirectUrl(false));
    }

    const token = this.authService.createAuthToken(user);
    res.cookie(this.authService.getAuthCookieName(), token, this.authService.getAuthCookieOptions());

    return res.redirect(this.authService.getAuthRedirectUrl(true));
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.authService.getAuthCookieName(), this.authService.getAuthCookieOptions());
    return { success: true };
  }

  private async buildUserResponse(user: AuthUser) {
    try {
      const dbUser = await this.usersService.ensureUserForAuth(user);
      if (!dbUser) {
        return user;
      }

      const roles = await this.usersService.getRolesForUser(dbUser.id);

      return {
        ...user,
        role: dbUser.role ?? null,
        roles: roles.map((role) => ({ id: role.id, name: role.name })),
        isActive: dbUser.isActive ?? true,
      };
    } catch (error) {
      console.error('Failed to enrich auth user:', error);
      return user;
    }
  }
}
