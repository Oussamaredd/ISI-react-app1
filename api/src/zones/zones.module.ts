import { Module } from '@nestjs/common';

import { ZonesController } from './zones.controller.js';
import { ZonesRepository } from './zones.repository.js';
import { ZonesService } from './zones.service.js';

@Module({
  controllers: [ZonesController],
  providers: [ZonesRepository, ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
