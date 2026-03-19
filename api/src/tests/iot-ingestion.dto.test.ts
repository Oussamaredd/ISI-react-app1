import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BatchIngestDto, IngestMeasurementDto } from '../modules/iot/ingestion/dto/ingest-measurement.dto.js';

describe('IngestMeasurementDto', () => {
  it('rejects invalid measurement payloads', async () => {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    await expect(
      validationPipe.transform(
        {
          deviceUid: 'sensor-001',
          fillLevelPercent: 'invalid',
        },
        {
          type: 'body',
          metatype: IngestMeasurementDto,
        },
      ),
    ).rejects.toThrow();
  });

  it('accepts batch payloads and coerces optional numeric telemetry fields', async () => {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const result = (await validationPipe.transform(
      {
        measurements: [
          {
            deviceUid: 'sensor-001',
            measuredAt: new Date().toISOString(),
            fillLevelPercent: '42',
            temperatureC: '21',
            batteryPercent: '88',
            signalStrength: '-72',
            measurementQuality: 'suspect',
          },
        ],
      },
      {
        type: 'body',
        metatype: BatchIngestDto,
      },
    )) as BatchIngestDto;

    expect(result.measurements).toHaveLength(1);
    expect(result.measurements[0]).toEqual(
      expect.objectContaining({
        fillLevelPercent: 42,
        temperatureC: 21,
        batteryPercent: 88,
        signalStrength: -72,
        measurementQuality: 'suspect',
      }),
    );
  });
});
