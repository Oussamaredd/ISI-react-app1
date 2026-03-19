import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigModule } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { RoutingClient } from '../modules/collections/routing/routing.client.js';
import { TOURS_ROUTE_COORDINATION_PORT } from '../modules/collections/tours.contract.js';
import { ToursController } from '../modules/collections/tours.controller.js';
import { ToursModule } from '../modules/collections/tours.module.js';
import { ToursRepository } from '../modules/collections/tours.repository.js';
import { ToursService } from '../modules/collections/tours.service.js';
import { ContainersController } from '../modules/iot/containers.controller.js';
import { ContainersModule } from '../modules/iot/containers.module.js';
import { ContainersRepository } from '../modules/iot/containers.repository.js';
import { ContainersService } from '../modules/iot/containers.service.js';
import { IngestionController } from '../modules/iot/ingestion/ingestion.controller.js';
import { IngestionModule } from '../modules/iot/ingestion/ingestion.module.js';
import { IngestionProcessorService } from '../modules/iot/ingestion/ingestion.processor.js';
import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import { IngestionRepository } from '../modules/iot/ingestion/ingestion.repository.js';
import { IngestionService } from '../modules/iot/ingestion/ingestion.service.js';

const readModuleMetadata = (key: string, target: object) =>
  Reflect.getMetadata(key, target) as unknown[] | undefined;

describe('IoT module wiring', () => {
  it('registers the tours module controller, providers, and exported coordination port', () => {
    expect(readModuleMetadata(MODULE_METADATA.IMPORTS, ToursModule)).toEqual(
      expect.arrayContaining([AuthModule, ConfigModule]),
    );
    expect(readModuleMetadata(MODULE_METADATA.CONTROLLERS, ToursModule)).toEqual([ToursController]);
    expect(readModuleMetadata(MODULE_METADATA.PROVIDERS, ToursModule)).toEqual(
      expect.arrayContaining([
        ToursRepository,
        RoutingClient,
        ToursService,
        expect.objectContaining({
          provide: TOURS_ROUTE_COORDINATION_PORT,
          useExisting: ToursService,
        }),
      ]),
    );
    expect(readModuleMetadata(MODULE_METADATA.EXPORTS, ToursModule)).toEqual(
      expect.arrayContaining([TOURS_ROUTE_COORDINATION_PORT, RoutingClient]),
    );
  });

  it('registers the ingestion module dependencies and worker services', () => {
    expect(readModuleMetadata(MODULE_METADATA.IMPORTS, IngestionModule)).toEqual(
      expect.arrayContaining([ConfigModule, DatabaseModule]),
    );
    expect(readModuleMetadata(MODULE_METADATA.CONTROLLERS, IngestionModule)).toEqual([
      IngestionController,
    ]);
    expect(readModuleMetadata(MODULE_METADATA.PROVIDERS, IngestionModule)).toEqual(
      expect.arrayContaining([
        IngestionRepository,
        IngestionProcessorService,
        IngestionService,
        InMemoryIngestionQueue,
      ]),
    );
    expect(readModuleMetadata(MODULE_METADATA.EXPORTS, IngestionModule)).toEqual([IngestionService]);
  });

  it('registers the containers module service boundary', () => {
    expect(readModuleMetadata(MODULE_METADATA.CONTROLLERS, ContainersModule)).toEqual([
      ContainersController,
    ]);
    expect(readModuleMetadata(MODULE_METADATA.PROVIDERS, ContainersModule)).toEqual([
      ContainersRepository,
      ContainersService,
    ]);
    expect(readModuleMetadata(MODULE_METADATA.EXPORTS, ContainersModule)).toEqual([
      ContainersService,
    ]);
  });

  it('loads the tours, ingestion, and containers modules without circular import failures', () => {
    expect(ToursModule).toBeDefined();
    expect(ContainersModule).toBeDefined();
    expect(IngestionModule).toBeDefined();
  });
});
