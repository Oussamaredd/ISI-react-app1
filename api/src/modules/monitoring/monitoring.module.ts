import { type MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { HttpMetricsMiddleware } from './http-metrics.middleware.js';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringService } from './monitoring.service.js';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, HttpMetricsMiddleware],
  exports: [MonitoringService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

