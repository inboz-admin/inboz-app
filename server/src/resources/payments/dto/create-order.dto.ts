import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { Currency } from 'src/resources/subscriptions/entities/subscription.entity';
import { PaymentProvider } from 'src/common/enums/payment-provider.enum';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  receipt?: string;

  @IsOptional()
  notes?: Record<string, any>;

  @IsOptional()
  planName?: string;

  @IsOptional()
  planDescription?: string;

  @IsOptional()
  billingCycle?: string;

  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;
}



