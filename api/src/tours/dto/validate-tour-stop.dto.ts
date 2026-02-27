import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

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
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
