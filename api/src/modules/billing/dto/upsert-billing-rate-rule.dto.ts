import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';

import type { BillingSourceType, BillingUnit } from '../billing.contracts.js';

export class UpsertBillingRateRuleDto {
  @IsString()
  @Length(2, 80)
  chargeType!: string;

  @IsString()
  @IsIn(['collection_event', 'alert_event'])
  sourceType!: BillingSourceType;

  @IsString()
  @IsIn(['event', 'liter'])
  unit!: BillingUnit;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @IsString()
  @Length(2, 160)
  description!: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isPenalty?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
