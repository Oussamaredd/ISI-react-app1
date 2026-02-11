import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';

import { AdminAuditController } from './admin.audit.controller.js';
import { AdminAuditRepository } from './admin.audit.repository.js';
import { AdminAuditService } from './admin.audit.service.js';
import { AdminGuard } from './admin.guard.js';
import { AdminHotelsController } from './admin.hotels.controller.js';
import { AdminHotelsRepository } from './admin.hotels.repository.js';
import { AdminHotelsService } from './admin.hotels.service.js';
import { AdminRolesController } from './admin.roles.controller.js';
import { AdminRolesRepository } from './admin.roles.repository.js';
import { AdminRolesService } from './admin.roles.service.js';
import { AdminSettingsController } from './admin.settings.controller.js';
import { AdminSettingsRepository } from './admin.settings.repository.js';
import { AdminSettingsService } from './admin.settings.service.js';
import { AdminUsersController } from './admin.users.controller.js';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [
    AdminUsersController,
    AdminRolesController,
    AdminHotelsController,
    AdminAuditController,
    AdminSettingsController,
  ],
  providers: [
    AdminGuard,
    AdminAuditRepository,
    AdminAuditService,
    AdminRolesRepository,
    AdminRolesService,
    AdminHotelsRepository,
    AdminHotelsService,
    AdminSettingsRepository,
    AdminSettingsService,
  ],
})
export class AdminModule {}
