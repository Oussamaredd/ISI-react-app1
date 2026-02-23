import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DispatchTestNotificationDto {
  @IsIn(['critical', 'warning', 'info'])
  severity!: 'critical' | 'warning' | 'info';

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsIn(['email', 'sms', 'push'])
  channel?: 'email' | 'sms' | 'push';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  recipient?: string;
}
