import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Organization } from 'src/resources/organizations/entities/organization.entity';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');

    if (!secretKey) {
      this.logger.warn('Stripe secret key not configured. Payment features will not work.');
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
      });
    }
  }

  /**
   * Create a Stripe customer for an organization
   */
  async createCustomer(organization: Organization): Promise<Stripe.Customer> {
    try {
      if (!this.stripe) {
        const errorMsg = 'Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      const customer = await this.stripe.customers.create({
        name: organization.name,
        email: organization.billingEmail || organization.domain,
        phone: organization.phone || undefined,
        metadata: {
          organizationId: organization.id,
          domain: organization.domain,
        },
      });

      this.logger.log(`Created Stripe customer ${customer.id} for organization ${organization.id}`);
      return customer;
    } catch (error) {
      let errorMessage = 'Failed to create Stripe customer';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'type' in error) {
        const stripeError = error as Stripe.errors.StripeError;
        errorMessage = stripeError.message || errorMessage;
      }

      this.logger.error(`Failed to create Stripe customer for organization ${organization.id}:`, {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Get Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new BadRequestException(`Customer ${customerId} has been deleted`);
      }
      return customer as Stripe.Customer;
    } catch (error) {
      let errorMessage = 'Failed to retrieve Stripe customer';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to retrieve Stripe customer ${customerId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create Stripe Checkout Session for one-time payment
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    description?: string;
    mode?: 'payment' | 'subscription';
    interval?: 'month' | 'year';
  }): Promise<Stripe.Checkout.Session> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      if (params.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      const sessionMode = params.mode || 'payment';
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: sessionMode,
        payment_method_types: ['card'],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {},
      };

      if (sessionMode === 'subscription') {
        // For subscriptions, create a price and use it
        const price = await this.stripe.prices.create({
          currency: params.currency.toLowerCase(),
          unit_amount: Math.round(params.amount * 100), // Convert to cents
          recurring: {
            interval: params.interval || 'month',
          },
          product_data: {
            name: params.description || 'Subscription',
          },
        });

        sessionParams.line_items = [
          {
            price: price.id,
            quantity: 1,
          },
        ];
      } else {
        // For one-time payments
        sessionParams.line_items = [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.description || 'Subscription Payment',
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ];
      }

      if (params.customerId) {
        sessionParams.customer = params.customerId;
      } else if (params.customerEmail) {
        sessionParams.customer_email = params.customerEmail;
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(`Created Stripe checkout session ${session.id} (mode: ${sessionMode}) for amount ${params.amount} ${params.currency}`);
      return session;
    } catch (error) {
      let errorMessage = 'Failed to create Stripe checkout session';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error('Failed to create Stripe checkout session:', {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create Stripe Subscription with automatic recurring billing
   */
  async createSubscription(params: {
    customerId: string;
    priceId?: string;
    amount?: number;
    currency?: string;
    interval: 'month' | 'year';
    metadata?: Record<string, string>;
    description?: string;
    billingCycleAnchor?: number; // Unix timestamp for when billing cycle should start
  }): Promise<Stripe.Subscription> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        metadata: params.metadata || {},
      };

      // Set billing cycle anchor if provided (for aligning with existing subscription period)
      if (params.billingCycleAnchor) {
        subscriptionParams.billing_cycle_anchor = params.billingCycleAnchor;
      }

      if (params.priceId) {
        // Use existing price ID
        subscriptionParams.items = [
          {
            price: params.priceId,
          },
        ];
      } else if (params.amount && params.currency) {
        // Create price on the fly
        const price = await this.stripe.prices.create({
          currency: params.currency.toLowerCase(),
          unit_amount: Math.round(params.amount * 100), // Convert to cents
          recurring: {
            interval: params.interval,
          },
          product_data: {
            name: params.description || 'Subscription',
          },
        });

        subscriptionParams.items = [
          {
            price: price.id,
          },
        ];
      } else {
        throw new BadRequestException('Either priceId or amount+currency must be provided');
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      this.logger.log(`Created Stripe subscription ${subscription.id} for customer ${params.customerId}`);
      return subscription;
    } catch (error) {
      let errorMessage = 'Failed to create Stripe subscription';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error('Failed to create Stripe subscription:', {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Get Stripe subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      let errorMessage = 'Failed to retrieve Stripe subscription';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to retrieve Stripe subscription ${subscriptionId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Cancel Stripe subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      if (immediately) {
        const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
        this.logger.log(`Cancelled Stripe subscription ${subscriptionId} immediately`);
        return subscription;
      } else {
        // Cancel at period end
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        this.logger.log(`Scheduled cancellation for Stripe subscription ${subscriptionId} at period end`);
        return subscription;
      }
    } catch (error) {
      let errorMessage = 'Failed to cancel Stripe subscription';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to cancel Stripe subscription ${subscriptionId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Update Stripe subscription (plan, quantity, etc.)
   */
  async updateSubscription(
    subscriptionId: string,
    params: {
      priceId?: string;
      quantity?: number;
      metadata?: Record<string, string>;
      prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    },
  ): Promise<Stripe.Subscription> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const updateParams: Stripe.SubscriptionUpdateParams = {
        metadata: params.metadata,
        proration_behavior: params.prorationBehavior || 'create_prorations',
      };

      if (params.priceId) {
        // Get current subscription to update items
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [
          {
            id: subscription.items.data[0].id,
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ];
      } else if (params.quantity !== undefined) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [
          {
            id: subscription.items.data[0].id,
            quantity: params.quantity,
          },
        ];
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, updateParams);

      this.logger.log(`Updated Stripe subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      let errorMessage = 'Failed to update Stripe subscription';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to update Stripe subscription ${subscriptionId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Retrieve Stripe Checkout Session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      let errorMessage = 'Failed to retrieve Stripe checkout session';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to retrieve Stripe checkout session ${sessionId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Retrieve Stripe Invoice
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      let errorMessage = 'Failed to retrieve Stripe invoice';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to retrieve Stripe invoice ${invoiceId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
      if (!webhookSecret) {
        this.logger.error('Stripe webhook secret not configured. Cannot verify webhook signature.');
        return false;
      }

      try {
        this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        return true;
      } catch (err) {
        this.logger.warn('Invalid Stripe webhook signature');
        return false;
      }
    } catch (error) {
      this.logger.error('Error verifying Stripe webhook signature:', error);
      return false;
    }
  }

  /**
   * Construct webhook event from payload and signature
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
      if (!webhookSecret) {
        throw new BadRequestException('Stripe webhook secret not configured');
      }

      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Error constructing Stripe webhook event:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      let errorMessage = 'Failed to retrieve Stripe payment intent';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to retrieve Stripe payment intent ${paymentIntentId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create Customer Portal session for customer to view invoices and manage billing
   * This redirects users to Stripe's hosted billing portal where they can:
   * - View all invoices
   * - Download PDFs
   * - View payment history
   * - Update payment methods
   * - Cancel subscriptions
   */
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const baseUrl = this.configService.get('APP_URL') || this.configService.get('BASE_URL') || 'http://localhost:3000';
      const frontendUrl = this.configService.get('FRONTEND_URL') || baseUrl.replace(':4000', ':3000');

      const session = await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl || `${frontendUrl}/dashboard/subscriptions`,
      });

      this.logger.log(`Created Stripe Customer Portal session for customer ${params.customerId}`);
      return session;
    } catch (error) {
      let errorMessage = 'Failed to create Stripe Customer Portal session';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to create Stripe Customer Portal session for customer ${params.customerId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create a credit note for an invoice
   */
  async createCreditNote(params: {
    invoiceId: string;
    amount: number;
    reason?: 'duplicate' | 'fraudulent' | 'order_change' | 'product_unsatisfactory';
    memo?: string;
  }): Promise<Stripe.CreditNote> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const creditNote = await this.stripe.creditNotes.create({
        invoice: params.invoiceId,
        amount: Math.round(params.amount * 100), // Convert to cents
        reason: params.reason || 'order_change',
        memo: params.memo,
      });

      this.logger.log(`Created credit note ${creditNote.id} for invoice ${params.invoiceId}, amount: $${params.amount}`);
      return creditNote;
    } catch (error) {
      let errorMessage = 'Failed to create credit note';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to create credit note for invoice ${params.invoiceId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * List all invoices for a customer
   */
  async listCustomerInvoices(customerId: string, limit: number = 100): Promise<Stripe.Invoice[]> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not initialized');
      }

      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data;
    } catch (error) {
      let errorMessage = 'Failed to list customer invoices';
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.logger.error(`Failed to list invoices for customer ${customerId}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }
}

