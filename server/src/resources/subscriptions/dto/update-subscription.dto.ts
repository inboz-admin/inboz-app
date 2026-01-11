import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  pendingUserCount?: number | null;

  @IsOptional()
  @IsString()
  pendingPlanId?: string | null;

  @IsOptional()
  @IsString()
  pendingChangeReason?: string | null;
}



























