import { Module } from '@nestjs/common';

import { ToursController } from './tours.controller.js';
import { ToursRepository } from './tours.repository.js';
import { ToursService } from './tours.service.js';

@Module({
  controllers: [ToursController],
  providers: [ToursRepository, ToursService],
  exports: [ToursService],
})
export class ToursModule {}
