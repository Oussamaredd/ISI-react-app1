import { Module } from '@nestjs/common';
import { HotelsController } from './hotels.controller.js';
import { HotelsRepository } from './hotels.repository.js';
import { HotelsService } from './hotels.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [HotelsController],
  providers: [HotelsRepository, HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
