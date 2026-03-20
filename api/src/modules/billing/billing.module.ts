import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { BillingController } from './billing.controller.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingRepository, BillingService],
  exports: [BillingService],
})
export class BillingModule {}
