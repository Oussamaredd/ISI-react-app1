import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { HotelsController } from './hotels.controller.js';
import { HotelsRepository } from './hotels.repository.js';
import { HotelsService } from './hotels.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HotelsController],
  providers: [HotelsRepository, HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
