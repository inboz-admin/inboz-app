import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { RazorpayService } from './razorpay.service';
import { StripeService } from './stripe.service';
import { StripeWebhookProcessor } from './stripe-webhook.processor';
import { PaymentsController } from './payments.controller';
import razorpayConfig from 'src/configuration/payments/razorpay.config';
import stripeConfig from 'src/configuration/payments/stripe.config';
import { Subscription } from 'src/resources/subscriptions/entities/subscription.entity';
import { Invoice } from 'src/resources/subscriptions/entities/invoice.entity';
import { SubscriptionsModule } from 'src/resources/subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forFeature(razorpayConfig),
    ConfigModule.forFeature(stripeConfig),
    SequelizeModule.forFeature([Subscription, Invoice]),
    forwardRef(() => SubscriptionsModule), // Import SubscriptionsModule to access SubscriptionPaymentService
  ],
  controllers: [PaymentsController],
  providers: [
    RazorpayService,
    StripeService,
    StripeWebhookProcessor,
  ],
  exports: [RazorpayService, StripeService],
})
export class PaymentsModule {}

