import { IsArray, IsBoolean, IsDateString, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateReportDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @IsString({ each: true })
  selectedKpis!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10)
  format?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsEmail()
  emailTo?: string;
}
