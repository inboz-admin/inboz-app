import { Controller, Post, Body, Headers, Logger, BadRequestException, RawBodyRequest, Req } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { StripeService } from './stripe.service';
import { StripeWebhookProcessor } from './stripe-webhook.processor';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Request } from 'express';
import { Public } from 'src/configuration/jwt/public.decorator';

@Controller()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly stripeService: StripeService,
    private readonly stripeWebhookProcessor: StripeWebhookProcessor,
  ) {
    // Log when controller is initialized to verify it's loaded
    this.logger.log('PaymentsController initialized - webhook endpoints: POST /api/v1/payments/stripe/webhook, POST /api/v1/payments/razorpay/webhook');
  }

  @Public()
  @Post('razorpay/webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    try {
      // Verify webhook signature
      const payloadString = JSON.stringify(payload);
      const isValid = this.razorpayService.verifyWebhookSignature(payloadString, signature);

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }

      this.logger.log(`Received Razorpay webhook: ${payload.event}`);

      // TODO: Process webhook events asynchronously
      // This should be handled by a queue/worker to avoid blocking the webhook response
      // For now, just log the event - actual processing will be done via verify-payment endpoint

      // Return success response immediately
      return {
        success: true,
        message: 'Webhook received',
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }


  @Public()
  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      const payload = req.rawBody;
      if (!payload) {
        this.logger.warn('Missing webhook payload');
        throw new BadRequestException('Missing webhook payload');
      }

      if (!signature) {
        this.logger.warn('Missing Stripe signature header');
        throw new BadRequestException('Missing webhook signature');
      }

      // Construct and verify webhook event (this also verifies signature)
      let event: any;
      try {
        event = this.stripeService.constructWebhookEvent(payload, signature);
        this.logger.log(`Received Stripe webhook: ${event.type} [${event.id}]`);
      } catch (error: any) {
        this.logger.warn(`Invalid Stripe webhook signature: ${error.message}`);
        throw new BadRequestException('Invalid webhook signature');
      }

      // Process event asynchronously (don't await to return quickly)
      this.stripeWebhookProcessor.processEvent(event).catch((error) => {
        this.logger.error(`Error processing Stripe webhook event ${event.type}:`, error);
      });

      // Return success response immediately (Stripe expects 200 within 5 seconds)
      return {
        received: true,
        eventType: event.type,
        eventId: event.id,
      };
    } catch (error) {
      this.logger.error('Error processing Stripe webhook:', error);
      throw error;
    }
  }

  @Post('verify')
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    try {
      const isValid = this.razorpayService.verifyPaymentSignature(verifyPaymentDto);

      if (!isValid) {
        throw new BadRequestException('Invalid payment signature');
      }

      // Fetch payment details
      const paymentDetails = await this.razorpayService.getPaymentDetails(
        verifyPaymentDto.paymentId,
      );

      return {
        success: true,
        payment: paymentDetails,
      };
    } catch (error) {
      this.logger.error('Error verifying payment:', error);
      throw error;
    }
  }
}

