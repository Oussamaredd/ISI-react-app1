import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateBillingAccountDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @IsIn(['zone'])
  scopeType!: 'zone';

  @IsString()
  @Length(36, 36)
  scopeKey!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
