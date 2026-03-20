import { IsISO8601, IsUUID } from 'class-validator';

export class BillingRunDto {
  @IsUUID()
  billingAccountId!: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;
}
