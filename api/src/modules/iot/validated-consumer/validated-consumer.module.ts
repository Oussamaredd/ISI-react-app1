import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../../database/database.module.js';

import { ValidatedConsumerProcessorService } from './validated-consumer.processor.js';
import { InMemoryValidatedDeliveryQueue } from './validated-consumer.queue.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';
import { ValidatedConsumerService } from './validated-consumer.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    ValidatedConsumerRepository,
    ValidatedConsumerProcessorService,
    ValidatedConsumerService,
    InMemoryValidatedDeliveryQueue,
  ],
  exports: [ValidatedConsumerService],
})
export class ValidatedConsumerModule {}
