import { Body, Controller, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { ForgotPasswordDto } from './forgot-password.dto.js';
import { LoginDto } from './login.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';
import { SignupDto } from './signup.dto.js';
import { UpdateProfileDto } from './update-profile.dto.js';

const AUTH_ABUSE_THROTTLE = {
  default: {
    limit: 10,
    ttl: 60_000,
  },
};

@Controller()
export class LocalAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signupLocal(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  @Throttle(AUTH_ABUSE_THROTTLE)
  async login(@Body() dto: LoginDto) {
    return this.authService.loginLocal(dto.email, dto.password);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.authService.getAuthCookieName(), this.authService.getAuthCookieOptions());
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.authService.getCurrentUser(req);
    return { user };
  }

  @Put('me')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateCurrentUserProfile(req, {
      displayName: dto.displayName,
    });
    return { user };
  }

  @Post('forgot-password')
  @Throttle(AUTH_ABUSE_THROTTLE)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.createPasswordReset(dto.email);

    if (response.statusCode === 204) {
      res.status(204);
      return;
    }

    return response.body ?? { success: true };
  }

  @Post('reset-password')
  @Throttle(AUTH_ABUSE_THROTTLE)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
