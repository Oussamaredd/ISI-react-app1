import { Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { AuthUser } from './auth.types.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getStatus(@Req() req: Request) {
    const user = this.authService.getAuthUserFromCookie(req.headers.cookie);

    if (!user) {
      return { authenticated: false };
    }

    return { authenticated: true, user };
  }

  @Get('me')
  getCurrentUser(@Req() req: Request) {
    const user = this.authService.getAuthUserFromCookie(req.headers.cookie);
    if (!user) {
      throw new UnauthorizedException();
    }

    return { user };
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
}
