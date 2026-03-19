import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../../database/database.module.js';

import { IngestionController } from './ingestion.controller.js';
import { IngestionProcessorService } from './ingestion.processor.js';
import { InMemoryIngestionQueue } from './ingestion.queue.js';
import { IngestionRepository } from './ingestion.repository.js';
import { IngestionService } from './ingestion.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [IngestionController],
  providers: [
    IngestionRepository,
    IngestionProcessorService,
    IngestionService,
    InMemoryIngestionQueue,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
