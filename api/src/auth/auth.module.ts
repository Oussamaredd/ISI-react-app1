import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedUserGuard } from './authenticated-user.guard.js';
import { GoogleStrategy } from './google.strategy.js';
import { PermissionsGuard } from './permissions.guard.js';

@Module({
  imports: [PassportModule.register({ session: false }), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, AuthenticatedUserGuard, PermissionsGuard],
  exports: [AuthService, AuthenticatedUserGuard, PermissionsGuard, UsersModule],
})
export class AuthModule {}
