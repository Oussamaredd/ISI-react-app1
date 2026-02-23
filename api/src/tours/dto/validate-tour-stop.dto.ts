import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class ValidateTourStopDto {
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  qrCode?: string;

  @IsInt()
  @Min(0)
  volumeLiters!: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  latitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  longitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
