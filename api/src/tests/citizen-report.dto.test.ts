import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { CreateCitizenReportDto } from '../modules/citizen/dto/create-citizen-report.dto.js';

describe('CreateCitizenReportDto', () => {
  it('rejects photoUrl values that are not valid http/https URLs', async () => {
    const dto = plainToInstance(CreateCitizenReportDto, {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      reportType: 'container_full',
      description: 'Overflow near school',
      photoUrl: 'not-a-url',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'photoUrl')).toBe(true);
  });

  it('accepts valid http/https photoUrl values', async () => {
    const dto = plainToInstance(CreateCitizenReportDto, {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      reportType: 'container_full',
      description: 'Overflow near school',
      photoUrl: 'https://example.com/overflow.jpg',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts image data URLs for optional mobile photo evidence', async () => {
    const dto = plainToInstance(CreateCitizenReportDto, {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      reportType: 'container_full',
      photoUrl: 'data:image/jpeg;base64,YWJj',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

