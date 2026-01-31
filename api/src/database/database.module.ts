import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DRIZZLE } from './database.constants.js';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE,
      useFactory: (database: DatabaseService) => database.client,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DRIZZLE],
})
export class DatabaseModule {}
