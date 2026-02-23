import { Module } from '@nestjs/common';

import { CitizenReportsController } from './citizen-reports.controller.js';
import { CitizenReportsRepository } from './citizen-reports.repository.js';
import { CitizenReportsService } from './citizen-reports.service.js';

@Module({
  controllers: [CitizenReportsController],
  providers: [CitizenReportsRepository, CitizenReportsService],
  exports: [CitizenReportsService],
})
export class CitizenReportsModule {}
