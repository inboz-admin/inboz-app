import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StripeService } from './stripe.service';
import { Subscription, SubscriptionStatus, BillingCycle } from 'src/resources/subscriptions/entities/subscription.entity';
import { Invoice, InvoiceStatus } from 'src/resources/subscriptions/entities/invoice.entity';
import Stripe from 'stripe';
import { InvoiceGenerationService } from 'src/resources/subscriptions/services/invoice-generation.service';
import { SubscriptionRenewalService } from 'src/resources/subscriptions/services/subscription-renewal.service';
import { SubscriptionPaymentService } from 'src/resources/subscriptions/services/subscription-payment.service';
import { PaymentProvider } from 'src/common/enums/payment-provider.enum';

@Injectable()
export class StripeWebhookProcessor {
  private readonly logger = new Logger(StripeWebhookProcessor.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(Invoice)
    private readonly invoiceModel: typeof Invoice,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    private readonly subscriptionRenewalService: SubscriptionRenewalService,
    @Inject(forwardRef(() => SubscriptionPaymentService))
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  /**
   * Process Stripe webhook event
   */
  async processEvent(event: Stripe.Event): Promise<void> {
    try {
      this.logger.log(`Processing Stripe webhook event: ${event.type}`);

      switch (event.type) {
        // Payment and checkout events
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          // Payment intent succeeded - log for tracking, actual processing via checkout.session.completed
          this.logger.debug(`Payment intent succeeded: ${(event.data.object as Stripe.PaymentIntent).id}`);
          break;
        case 'charge.succeeded':
          // Charge succeeded - log for tracking
          this.logger.debug(`Charge succeeded: ${(event.data.object as Stripe.Charge).id}`);
          break;
        
        // Subscription lifecycle events
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        // Invoice events
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.finalized':
          // Invoice finalized - log for tracking
          this.logger.debug(`Invoice finalized: ${(event.data.object as Stripe.Invoice).id}`);
          break;
        case 'invoice.paid':
          // Invoice paid - log for tracking (invoice.payment_succeeded is the primary handler)
          this.logger.debug(`Invoice paid: ${(event.data.object as Stripe.Invoice).id}`);
          break;
        case 'invoice_payment.paid':
          // Invoice payment paid - this is essentially the same as invoice.payment_succeeded
          // The invoice_payment object contains invoice reference
          // We'll let invoice.payment_succeeded handle the actual processing
          // This event is just logged for tracking
          const invoicePayment = event.data.object as any;
          const invoiceId = invoicePayment.invoice;
          this.logger.debug(`Invoice payment paid: invoice ${invoiceId} [${event.id}]`);
          // Note: invoice.payment_succeeded will handle the actual subscription/invoice updates
          break;
        
        // Customer events (informational, no action needed)
        case 'customer.created':
        case 'customer.updated':
        case 'payment_method.attached':
          // These are informational events, just log them
          this.logger.debug(`Stripe event received: ${event.type} [${event.id}]`);
          break;
        
        // Product/Price events (informational, no action needed)
        case 'product.created':
        case 'plan.created':
        case 'price.created':
          // These are informational events, just log them
          this.logger.debug(`Stripe event received: ${event.type} [${event.id}]`);
          break;
        
        default:
          this.logger.debug(`Unhandled Stripe event type: ${event.type} [${event.id}]`);
      }
    } catch (error) {
      this.logger.error(`Error processing Stripe webhook event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   * For subscription mode: Link subscription ID to database subscription
   * For payment mode: Process payment and create subscription/invoice
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) {
      this.logger.warn('Checkout session completed but no organizationId in metadata');
      return;
    }

    this.logger.log(`Checkout session ${session.id} completed for organization ${organizationId} (mode: ${session.mode}, payment_status: ${session.payment_status})`);

    // For subscription mode, process payment and link subscription ID
    if (session.mode === 'subscription' && session.payment_status === 'paid' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;

      try {
        // Extract metadata needed for payment processing
        const planId = session.metadata?.planId;
        const userCount = session.metadata?.userCount ? parseInt(session.metadata.userCount) : undefined;
        const billingCycle = session.metadata?.billingCycle as BillingCycle;
        const operationType = session.metadata?.operationType as 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED' | undefined;
        const existingSubscriptionId = session.metadata?.existingSubscriptionId || null;

        if (!planId || !billingCycle) {
          this.logger.warn(`Checkout session ${session.id} missing required metadata (planId: ${planId}, billingCycle: ${billingCycle})`);
          return;
        }

        // Parse pricing breakdown from metadata
        const pricingBreakdown = session.metadata?.pricingBreakdown 
          ? JSON.parse(session.metadata.pricingBreakdown)
          : null;

        if (!pricingBreakdown) {
          this.logger.warn(`Checkout session ${session.id} missing pricingBreakdown in metadata`);
          return;
        }

        // Get payment intent ID from session
        // For subscription mode, payment_intent might be in the session or we need to get it from the invoice
        let paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id;

        // If no payment intent in session, try to get it from the latest invoice
        if (!paymentIntentId && subscriptionId) {
          try {
            const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
            if (stripeSubscription.latest_invoice) {
              const invoiceId = typeof stripeSubscription.latest_invoice === 'string'
                ? stripeSubscription.latest_invoice
                : stripeSubscription.latest_invoice.id;
              const invoice = await this.stripeService.getInvoice(invoiceId);
              // Access payment_intent using type casting since it's not in the TypeScript type
              const invoiceAny = invoice as any;
              paymentIntentId = typeof invoiceAny.payment_intent === 'string'
                ? invoiceAny.payment_intent
                : invoiceAny.payment_intent?.id;
            }
          } catch (error) {
            this.logger.warn(`Could not retrieve payment intent from invoice for subscription ${subscriptionId}:`, error);
          }
        }

        // Fallback to subscription ID if no payment intent found
        if (!paymentIntentId) {
          paymentIntentId = subscriptionId;
          this.logger.debug(`Using subscription ID ${subscriptionId} as payment reference for checkout session ${session.id}`);
        }

        // Process payment - this will create subscription and invoice
        const result = await this.subscriptionPaymentService.processPayment(
          organizationId,
          session.id, // orderId = checkout session ID
          paymentIntentId, // paymentId = payment intent ID or subscription ID
          '', // signature not needed for Stripe (verified via webhook signature)
          {
            planId,
            userCount: userCount || 1,
            billingCycle,
            operationType: operationType || 'TRIAL_TO_PAID',
            existingSubscriptionId,
          },
          pricingBreakdown,
          PaymentProvider.STRIPE,
        );

        // After processing payment, link the Stripe subscription ID
        // Also store checkout session ID in subscription metadata for credit note processing
        await this.subscriptionModel.update(
          {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer as string || null,
          },
          {
            where: {
              id: result.subscriptionId,
            },
          },
        );

        // Update Stripe subscription metadata with checkout session ID for credit note processing
        try {
          await this.stripeService.updateSubscription(subscriptionId, {
            metadata: {
              checkoutSessionId: session.id,
              organizationId,
              planId,
              billingCycle,
              userCount: (userCount || 1).toString(),
              subscriptionId: result.subscriptionId,
            },
          });
        } catch (updateError) {
          this.logger.warn(`Failed to update Stripe subscription metadata with checkout session ID:`, updateError);
        }

        this.logger.log(`Processed Stripe subscription payment for checkout session ${session.id}: subscription ${result.subscriptionId}, invoice ${result.invoiceId}, linked Stripe subscription ${subscriptionId}`);
      } catch (error) {
        this.logger.error(`Failed to process subscription payment for checkout session ${session.id}:`, error);
        // Don't throw - webhook should return success even if processing fails
        // The error is logged for investigation
      }
    } 
    // For payment mode, process payment and create subscription/invoice
    else if (session.mode === 'payment' && session.payment_status === 'paid') {
      try {
        // Extract metadata needed for payment processing
        const planId = session.metadata?.planId;
        const userCount = session.metadata?.userCount ? parseInt(session.metadata.userCount) : undefined;
        const billingCycle = session.metadata?.billingCycle as BillingCycle;
        const operationType = session.metadata?.operationType as 'TRIAL_TO_PAID' | 'UPGRADE' | 'ADD_USERS' | 'COMBINED' | undefined;
        const existingSubscriptionId = session.metadata?.existingSubscriptionId || null;

        if (!planId || !billingCycle) {
          this.logger.warn(`Checkout session ${session.id} missing required metadata (planId: ${planId}, billingCycle: ${billingCycle})`);
          return;
        }

        // Parse pricing breakdown from metadata
        const pricingBreakdown = session.metadata?.pricingBreakdown 
          ? JSON.parse(session.metadata.pricingBreakdown)
          : null;

        if (!pricingBreakdown) {
          this.logger.warn(`Checkout session ${session.id} missing pricingBreakdown in metadata`);
          return;
        }

        // Get payment intent ID from session
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id;

        if (!paymentIntentId) {
          this.logger.warn(`Checkout session ${session.id} missing payment_intent`);
          return;
        }

        // Process payment - this will create subscription and invoice
        const result = await this.subscriptionPaymentService.processPayment(
          organizationId,
          session.id, // orderId = checkout session ID
          paymentIntentId, // paymentId = payment intent ID
          '', // signature not needed for Stripe (verified via webhook signature)
          {
            planId,
            userCount: userCount || 1,
            billingCycle,
            operationType: operationType || 'TRIAL_TO_PAID',
            existingSubscriptionId,
          },
          pricingBreakdown,
          PaymentProvider.STRIPE,
        );

        this.logger.log(`Processed Stripe payment for checkout session ${session.id}: subscription ${result.subscriptionId}, invoice ${result.invoiceId}`);

        // For upgrades and combined operations, create a Stripe subscription for recurring billing
        // The initial payment was prorated, but we need to set up auto-renewal for the full plan amount
        if ((operationType === 'UPGRADE' || operationType === 'COMBINED') && session.customer) {
          try {
            // Get subscription to retrieve currentPeriodEnd for billing cycle anchor
            const dbSubscription = await this.subscriptionModel.findByPk(result.subscriptionId);
            if (!dbSubscription) {
              this.logger.warn(`Subscription ${result.subscriptionId} not found after payment processing`);
              return;
            }

            const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
            const interval = billingCycle === BillingCycle.YEARLY ? 'year' : 'month';
            const recurringAmount = pricingBreakdown.totalAmount; // Full plan amount for recurring billing
            const planName = session.metadata?.planName || 'Subscription'; // Use plan name from metadata (no DB query needed)
            const currentPeriodEnd = dbSubscription.currentPeriodEnd;

            // Create Stripe subscription for recurring billing
            // Set billing_cycle_anchor to currentPeriodEnd so first charge happens at period end
            // This ensures the prorated payment covers until then, and full billing starts after
            const subscriptionParams: any = {
              customerId,
              amount: recurringAmount,
              currency: 'USD',
              interval,
              metadata: {
                organizationId,
                planId,
                billingCycle,
                userCount: (userCount || 1).toString(),
                subscriptionId: result.subscriptionId,
              },
              description: `${planName} - ${billingCycle} subscription`,
            };

            // If we have a currentPeriodEnd, set billing_cycle_anchor so first charge aligns with period end
            if (currentPeriodEnd) {
              subscriptionParams.billingCycleAnchor = Math.floor(new Date(currentPeriodEnd).getTime() / 1000);
            }

            const stripeSubscription = await this.stripeService.createSubscription(subscriptionParams);

            // Link the Stripe subscription to the database subscription
            await this.subscriptionModel.update(
              {
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: customerId,
              },
              {
                where: { id: result.subscriptionId },
              },
            );

            this.logger.log(
              `Created Stripe subscription ${stripeSubscription.id} for recurring billing after upgrade. ` +
              `Database subscription ${result.subscriptionId} will auto-renew at $${recurringAmount}/${interval}`,
            );
          } catch (subscriptionError) {
            // Log error but don't fail the webhook - payment was already processed
            this.logger.error(
              `Failed to create Stripe subscription for recurring billing after upgrade payment:`,
              subscriptionError,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process payment for checkout session ${session.id}:`, error);
        // Don't throw - webhook should return success even if processing fails
        // The error is logged for investigation
      }
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) {
      this.logger.warn('Subscription created but no organizationId in metadata');
      return;
    }

    // Check if this subscription was created by us for recurring billing after an upgrade
    // If subscriptionId is in metadata, we should update that specific subscription
    const targetSubscriptionId = subscription.metadata?.subscriptionId;

    if (targetSubscriptionId) {
      // This is a recurring subscription we created after an upgrade
      // Update the specific subscription by ID
      const updateResult = await this.subscriptionModel.update(
        {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
        },
        {
          where: {
            id: targetSubscriptionId,
          },
        },
      );

      if (updateResult[0] > 0) {
        this.logger.log(`Stripe subscription ${subscription.id} linked to database subscription ${targetSubscriptionId}`);
      } else {
        this.logger.warn(`Database subscription ${targetSubscriptionId} not found when linking Stripe subscription ${subscription.id}`);
      }
    } else {
      // Generic subscription created - update subscription with Stripe subscription ID
      // Only update if stripeSubscriptionId is null (not already linked)
      await this.subscriptionModel.update(
        {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
        },
        {
          where: {
            organizationId,
            stripeSubscriptionId: null,
          },
        },
      );

      this.logger.log(`Stripe subscription ${subscription.id} linked to organization ${organizationId}`);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const dbSubscription = await this.subscriptionModel.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription ${subscription.id} not found in database`);
      return;
    }

    // Update subscription status based on Stripe status
    let status = SubscriptionStatus.ACTIVE;
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      status = SubscriptionStatus.CANCELLED;
    } else if (subscription.status === 'past_due') {
      status = SubscriptionStatus.PAST_DUE;
    } else if (subscription.status === 'incomplete') {
      status = SubscriptionStatus.INCOMPLETE;
    }

    // Stripe subscription properties use snake_case in API but TypeScript types may not expose them
    const stripeSub = subscription as any;
    await this.subscriptionModel.update(
      {
        status,
        currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
      },
      {
        where: { id: dbSubscription.id },
      },
    );

    this.logger.log(`Updated subscription ${dbSubscription.id} from Stripe webhook`);
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const dbSubscription = await this.subscriptionModel.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription ${subscription.id} not found in database`);
      return;
    }

    await this.subscriptionModel.update(
      {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: 'Cancelled via Stripe',
      },
      {
        where: { id: dbSubscription.id },
      },
    );

    this.logger.log(`Cancelled subscription ${dbSubscription.id} from Stripe webhook`);
  }

  /**
   * Handle invoice payment succeeded (auto-renewal)
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Invoice.subscription can be a string (ID) or Subscription object
    const subscriptionId = typeof (invoice as any).subscription === 'string' 
      ? (invoice as any).subscription 
      : (invoice as any).subscription?.id;
    
    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    const dbSubscription = await this.subscriptionModel.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found in database`);
      return;
    }

    // Update subscription period
    if (invoice.period_start && invoice.period_end) {
      await this.subscriptionModel.update(
        {
          currentPeriodStart: new Date(invoice.period_start * 1000),
          currentPeriodEnd: new Date(invoice.period_end * 1000),
          status: SubscriptionStatus.ACTIVE,
        },
        {
          where: { id: dbSubscription.id },
        },
      );
    }

    // Generate invoice record with Stripe invoice data
    try {
      await this.invoiceGenerationService.generateRenewalInvoice(
        dbSubscription.id,
        undefined, // transaction
        {
          stripeInvoiceId: invoice.id,
          amountPaid: invoice.amount_paid ? invoice.amount_paid / 100 : 0, // Convert from cents
          total: invoice.total ? invoice.total / 100 : 0,
          subtotal: invoice.subtotal ? invoice.subtotal / 100 : 0,
          tax: (invoice as any).tax ? (invoice as any).tax / 100 : 0,
          currency: invoice.currency?.toUpperCase() || 'USD',
          paidAt: invoice.status_transitions?.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          invoiceDate: invoice.created ? new Date(invoice.created * 1000) : new Date(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
          invoiceUrl: invoice.hosted_invoice_url || null,
          invoicePdf: invoice.invoice_pdf || null,
        },
      );
      this.logger.log(`Generated renewal invoice for subscription ${dbSubscription.id} with Stripe invoice ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Failed to generate renewal invoice:`, error);
    }

    this.logger.log(`Invoice payment succeeded for subscription ${dbSubscription.id}`);
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Invoice.subscription can be a string (ID) or Subscription object
    const subscriptionId = typeof (invoice as any).subscription === 'string' 
      ? (invoice as any).subscription 
      : (invoice as any).subscription?.id;
    
    if (!subscriptionId) {
      return;
    }

    const dbSubscription = await this.subscriptionModel.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!dbSubscription) {
      return;
    }

    await this.subscriptionModel.update(
      {
        status: SubscriptionStatus.PAST_DUE,
      },
      {
        where: { id: dbSubscription.id },
      },
    );

    this.logger.log(`Invoice payment failed for subscription ${dbSubscription.id}`);
  }

  /**
   * Handle invoice created
   */
  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    // Check if this is the first invoice for an upgrade with proration
    // If so, add a credit note to reduce the charge to the net amount
    const subscriptionId = typeof (invoice as any).subscription === 'string' 
      ? (invoice as any).subscription 
      : (invoice as any).subscription?.id;
    
    if (!subscriptionId) {
      this.logger.debug(`Invoice created: ${invoice.id} (not a subscription invoice)`);
      return;
    }

    this.logger.log(`Processing invoice.created for invoice ${invoice.id}, subscription ${subscriptionId}`);

    // Get the checkout session metadata to check for proration details
    // Try multiple methods to get the checkout session ID:
    // 1. From subscription metadata (if already updated)
    // 2. From database subscription record (if we've processed it)
    // 3. From invoice metadata (if Stripe copied it)
    try {
      let checkoutSessionId: string | null = null;
      
      // Method 1: Try to get from Stripe subscription metadata
      const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
      this.logger.debug(`Subscription ${subscriptionId} metadata:`, JSON.stringify(stripeSubscription.metadata));
      checkoutSessionId = stripeSubscription.metadata?.checkoutSessionId || null;
      
      // Method 2: If not in Stripe metadata, try to get from database subscription
      if (!checkoutSessionId) {
        const dbSubscription = await this.subscriptionModel.findOne({
          where: { stripeSubscriptionId: subscriptionId },
        });
        
        if (dbSubscription) {
          // Try to find the checkout session from the payment order/invoice
          // The checkout session ID might be stored in the invoice or we can search for recent checkout sessions
          this.logger.debug(`Found database subscription ${dbSubscription.id} for Stripe subscription ${subscriptionId}`);
          
          // Get the most recent invoice for this subscription to find the checkout session
          const recentInvoice = await this.invoiceModel.findOne({
            where: { subscriptionId: dbSubscription.id },
            order: [['createdAt', 'DESC']],
          });
          
          if (recentInvoice) {
            this.logger.debug(`Found recent invoice ${recentInvoice.id} for subscription ${dbSubscription.id}`);
          }
        }
      }
      
      // Method 3: Check invoice metadata (Stripe might have copied it)
      if (!checkoutSessionId && invoice.metadata) {
        checkoutSessionId = invoice.metadata.checkoutSessionId || null;
        this.logger.debug(`Invoice ${invoice.id} metadata:`, JSON.stringify(invoice.metadata));
      }
      
      if (!checkoutSessionId) {
        this.logger.warn(
          `No checkoutSessionId found for invoice ${invoice.id}, subscription ${subscriptionId}. ` +
          `Tried: subscription metadata, database lookup, invoice metadata. ` +
          `Will try to get proration details from database subscription record.`
        );
        
        // Try to get proration details from database subscription instead
        const dbSubscription = await this.subscriptionModel.findOne({
          where: { stripeSubscriptionId: subscriptionId },
        });
        
        if (dbSubscription && dbSubscription.prorationDetails) {
          // We have proration details in the database subscription
          const prorationDetails = typeof dbSubscription.prorationDetails === 'string' 
            ? JSON.parse(dbSubscription.prorationDetails) 
            : dbSubscription.prorationDetails;
          
          if (prorationDetails && prorationDetails.creditAmount > 0) {
            this.logger.log(
              `Found proration details in database subscription ${dbSubscription.id} for invoice ${invoice.id}`
            );
            
            // Process credit note using database proration details
            await this.createCreditNoteFromProrationDetails(
              invoice,
              prorationDetails,
              subscriptionId
            );
            return;
          }
        }
        
        // If we still don't have checkout session ID or proration details, we can't process
        this.logger.warn(
          `Cannot process credit note for invoice ${invoice.id}: ` +
          `No checkout session ID found and no proration details in database subscription.`
        );
        return;
      }

      this.logger.debug(`Found checkout session ID: ${checkoutSessionId} for subscription ${subscriptionId}`);
      
      const session = await this.stripeService.getCheckoutSession(checkoutSessionId);
      const operationType = session.metadata?.operationType;
      const pricingBreakdownStr = session.metadata?.pricingBreakdown;
      
      this.logger.debug(
        `Checkout session ${checkoutSessionId} - operationType: ${operationType}, ` +
        `has pricingBreakdown: ${!!pricingBreakdownStr}`
      );
      
      // Check if this is an upgrade with proration
      if ((operationType === 'UPGRADE' || operationType === 'COMBINED') && pricingBreakdownStr) {
        const pricingBreakdown = JSON.parse(pricingBreakdownStr);
        const prorationDetails = pricingBreakdown.prorationDetails;
        
        this.logger.debug(
          `Proration details for invoice ${invoice.id}: ` +
          `creditAmount: ${prorationDetails?.creditAmount}, ` +
          `chargeAmount: ${prorationDetails?.chargeAmount}, ` +
          `proratedAmount: ${prorationDetails?.proratedAmount}`
        );
        
        if (prorationDetails && prorationDetails.creditAmount > 0) {
          // This is an upgrade with proration - add credit note to reduce invoice to net charge
          const creditAmount = prorationDetails.creditAmount;
          const chargeAmount = prorationDetails.chargeAmount || 0; // Prorated charge for new plan
          const netCharge = prorationDetails.proratedAmount || (chargeAmount - creditAmount);
          
          // Calculate expected invoice amount (should be the prorated charge amount)
          // But Stripe creates invoice for full subscription amount, so we need to credit the difference
          const invoiceAmount = invoice.amount_due / 100; // Convert from cents
          
          this.logger.log(
            `Upgrade proration detected for invoice ${invoice.id}. ` +
            `Invoice amount: $${invoiceAmount}, ` +
            `Credit amount: $${creditAmount}, ` +
            `Charge amount: $${chargeAmount}, ` +
            `Net charge: $${netCharge}`
          );
          
          // The invoice will be for the full subscription amount, but we want to charge:
          // - Prorated charge for new plan (for remaining days)
          // - Minus credit for old plan (unused portion)
          // = Net charge (difference)
          
          // Calculate how much to credit:
          // If invoice is for full amount, credit = (full amount - prorated charge) + old plan credit
          // Or simpler: credit = full amount - net charge
          const expectedCharge = chargeAmount; // What we should charge (prorated new plan)
          const totalCreditNeeded = invoiceAmount - netCharge; // Total credit needed to get to net charge
          
          this.logger.debug(
            `Credit calculation for invoice ${invoice.id}: ` +
            `Expected charge: $${expectedCharge}, ` +
            `Total credit needed: $${totalCreditNeeded}`
          );
          
          if (totalCreditNeeded > 0 && creditAmount > 0) {
            // Create credit note for the difference
            // Credit = (Full invoice amount - prorated new plan charge) + old plan credit
            // Or simply: Credit = Full invoice - Net charge
            const creditNoteAmount = totalCreditNeeded;
            
            this.logger.log(
              `Creating credit note for invoice ${invoice.id}: ` +
              `Amount: $${creditNoteAmount}, ` +
              `Reason: order_change`
            );
            
            try {
              const creditNote = await this.stripeService.createCreditNote({
                invoiceId: invoice.id,
                amount: creditNoteAmount,
                reason: 'order_change',
                memo: `Upgrade proration: Credit $${creditAmount.toFixed(2)} for unused ${prorationDetails.oldPlanName || 'Previous Plan'} + Adjust to prorated charge of $${expectedCharge.toFixed(2)}. Net: $${netCharge.toFixed(2)}`,
              });
              
              this.logger.log(
                `✅ Successfully added credit note ${creditNote.id} of $${creditNoteAmount.toFixed(2)} to invoice ${invoice.id} ` +
                `for upgrade proration. Invoice: $${invoiceAmount.toFixed(2)}, Prorated charge: $${expectedCharge.toFixed(2)}, Old plan credit: $${creditAmount.toFixed(2)}, Net charge: $${netCharge.toFixed(2)}`,
              );
            } catch (creditError) {
              this.logger.error(
                `❌ Failed to create credit note for invoice ${invoice.id}:`,
                creditError
              );
              // Log the full error for debugging
              if (creditError instanceof Error) {
                this.logger.error(`Error message: ${creditError.message}`);
                this.logger.error(`Error stack: ${creditError.stack}`);
              }
              // Don't throw - invoice was already created, just log the error
            }
          } else {
            this.logger.warn(
              `Skipping credit note for invoice ${invoice.id}: ` +
              `totalCreditNeeded (${totalCreditNeeded}) <= 0 or creditAmount (${creditAmount}) <= 0`
            );
          }
        } else {
          this.logger.debug(
            `No proration details or creditAmount <= 0 for invoice ${invoice.id}. ` +
            `prorationDetails: ${JSON.stringify(prorationDetails)}`
          );
        }
      } else {
        this.logger.debug(
          `Not an upgrade/combined operation or missing pricingBreakdown for invoice ${invoice.id}. ` +
          `operationType: ${operationType}, has pricingBreakdown: ${!!pricingBreakdownStr}`
        );
      }
    } catch (error) {
      // If we can't process the credit, just log and continue
      // The invoice will be charged at full amount, but we can handle it in payment_succeeded
      this.logger.error(
        `❌ Error processing credit note for invoice ${invoice.id}:`,
        error
      );
      if (error instanceof Error) {
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
      }
    }
    
    this.logger.debug(`Completed processing invoice.created for invoice ${invoice.id}`);
  }

  /**
   * Helper method to create credit note from proration details
   */
  private async createCreditNoteFromProrationDetails(
    invoice: Stripe.Invoice,
    prorationDetails: any,
    subscriptionId: string,
  ): Promise<void> {
    const creditAmount = prorationDetails.creditAmount || 0;
    const chargeAmount = prorationDetails.chargeAmount || 0;
    const netCharge = prorationDetails.proratedAmount || (chargeAmount - creditAmount);
    const invoiceAmount = invoice.amount_due / 100; // Convert from cents
    const totalCreditNeeded = invoiceAmount - netCharge;

    this.logger.log(
      `Creating credit note from proration details for invoice ${invoice.id}. ` +
      `Invoice: $${invoiceAmount}, Credit: $${creditAmount}, Charge: $${chargeAmount}, Net: $${netCharge}, Credit needed: $${totalCreditNeeded}`
    );

    if (totalCreditNeeded > 0 && creditAmount > 0) {
      try {
        const creditNote = await this.stripeService.createCreditNote({
          invoiceId: invoice.id,
          amount: totalCreditNeeded,
          reason: 'order_change',
          memo: `Upgrade proration: Credit $${creditAmount.toFixed(2)} for unused ${prorationDetails.oldPlanName || 'Previous Plan'} + Adjust to prorated charge of $${chargeAmount.toFixed(2)}. Net: $${netCharge.toFixed(2)}`,
        });

        this.logger.log(
          `✅ Successfully added credit note ${creditNote.id} of $${totalCreditNeeded.toFixed(2)} to invoice ${invoice.id} ` +
          `for upgrade proration. Invoice: $${invoiceAmount.toFixed(2)}, Net charge: $${netCharge.toFixed(2)}`,
        );
      } catch (creditError) {
        this.logger.error(
          `❌ Failed to create credit note for invoice ${invoice.id}:`,
          creditError
        );
        if (creditError instanceof Error) {
          this.logger.error(`Error message: ${creditError.message}`);
          this.logger.error(`Error stack: ${creditError.stack}`);
        }
      }
    } else {
      this.logger.warn(
        `Skipping credit note for invoice ${invoice.id}: ` +
        `totalCreditNeeded (${totalCreditNeeded}) <= 0 or creditAmount (${creditAmount}) <= 0`
      );
    }
  }
}

