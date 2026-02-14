import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedUserGuard } from './authenticated-user.guard.js';
import { GoogleOAuthEnabledGuard } from './google-oauth-enabled.guard.js';
import { GoogleStrategy } from './google.strategy.js';
import { LocalAuthController } from './local-auth.controller.js';
import { PermissionsGuard } from './permissions.guard.js';

@Module({
  imports: [PassportModule.register({ session: false }), UsersModule],
  controllers: [AuthController, LocalAuthController],
  providers: [AuthService, GoogleStrategy, GoogleOAuthEnabledGuard, AuthenticatedUserGuard, PermissionsGuard],
  exports: [AuthService, GoogleOAuthEnabledGuard, AuthenticatedUserGuard, PermissionsGuard, UsersModule],
})
export class AuthModule {}
