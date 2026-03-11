import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { CITIZEN_REPORT_TYPES } from '../citizen-report.contract.js';

const PHOTO_REFERENCE_PATTERN =
  /^(https?:\/\/\S+|data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+)$/i;

export class CreateCitizenReportDto {
  @IsUUID()
  containerId!: string;

  @IsIn(CITIZEN_REPORT_TYPES)
  reportType!: (typeof CITIZEN_REPORT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Matches(PHOTO_REFERENCE_PATTERN, {
    message: 'photoUrl must be a valid http/https URL or image data URL',
  })
  @MaxLength(1_500_000)
  photoUrl?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;
}

