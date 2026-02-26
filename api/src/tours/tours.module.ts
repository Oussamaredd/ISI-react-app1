import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { ToursController } from './tours.controller.js';
import { ToursRepository } from './tours.repository.js';
import { ToursService } from './tours.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ToursController],
  providers: [ToursRepository, ToursService],
  exports: [ToursService],
})
export class ToursModule {}
