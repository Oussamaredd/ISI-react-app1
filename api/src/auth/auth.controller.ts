import { Body, ConflictException, Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { UsersService } from '../users/users.service.js';

import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { ExchangeCodeDto } from './exchange-code.dto.js';
import { GoogleOAuthEnabledGuard } from './google-oauth-enabled.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('status')
  async getStatus(@Req() req: Request) {
    const user = this.authService.getAuthUserFromRequest(req);

    if (!user) {
      return { authenticated: false };
    }

    const enriched = await this.buildUserResponse(user);
    return { authenticated: true, user: enriched };
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const user = this.authService.getAuthUserFromRequest(req);
    if (!user) {
      throw new UnauthorizedException();
    }

    const enriched = await this.buildUserResponse(user);
    return { user: enriched };
  }

  @Get('google')
  @UseGuards(GoogleOAuthEnabledGuard, AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthEnabledGuard, AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.redirect(
        this.authService.getAuthCallbackUrl({
          errorMessage: 'Unable to complete Google sign-in.',
        }),
      );
    }

    try {
      await this.authService.ensureGoogleSignInAllowed(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        return res.redirect(
          this.authService.getAuthCallbackUrl({
            errorMessage: error.message,
          }),
        );
      }
      throw error;
    }

    const exchangeCode = this.authService.issueExchangeCode(user);

    return res.redirect(
      this.authService.getAuthCallbackUrl({
        code: exchangeCode,
      }),
    );
  }

  @Post('exchange')
  async exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.authService.exchangeCode(dto.code);
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
        provider: dbUser.authProvider === 'google' ? 'google' : 'local',
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
