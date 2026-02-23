import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCitizenReportDto {
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsOptional()
  @IsUUID()
  reporterUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

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
  photoUrl?: string;
}
