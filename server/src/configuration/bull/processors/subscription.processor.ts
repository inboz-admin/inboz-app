import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import moment from 'moment-timezone';
import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName, JobType } from '../enums/queue.enum';
import { JobResult } from '../interfaces/queue.interface';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { SubscriptionsService } from 'src/resources/subscriptions/subscriptions.service';
import { SubscriptionPlansService } from 'src/resources/subscriptions/subscription-plans.service';
import { InvoiceGenerationService } from 'src/resources/subscriptions/services/invoice-generation.service';
import { SubscriptionStatus, BillingCycle, Currency } from 'src/resources/subscriptions/entities/subscription.entity';
import { defaultOrganizationConfig } from 'src/resources/organizations/config/organization.config';

@Processor(QueueName.SUBSCRIPTION)
export class SubscriptionProcessor extends WorkerHost {
  protected readonly logger = new Logger(SubscriptionProcessor.name);
  private readonly baseProcessor: SubscriptionProcessorImpl;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    private readonly transactionManager: TransactionManager,
  ) {
    super();
    this.baseProcessor = new SubscriptionProcessorImpl(
      subscriptionsService,
      subscriptionPlansService,
      invoiceGenerationService,
      transactionManager,
    );
  }

  async process(job: Job): Promise<any> {
    return await this.baseProcessor.executeWithLogging(job);
  }
}

class SubscriptionProcessorImpl extends BaseProcessor {
  protected readonly logger = new Logger('SubscriptionProcessorImpl');
  private readonly config = defaultOrganizationConfig;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly invoiceGenerationService: InvoiceGenerationService,
    private readonly transactionManager: TransactionManager,
  ) {
    super();
  }

  async process(job: Job): Promise<JobResult> {
    switch (job.name) {
      case JobType.CREATE_DEFAULT_SUBSCRIPTION:
        return await this.createDefaultSubscription(job);
      default:
        return this.createErrorResult(`Unknown job type: ${job.name}`);
    }
  }

  private async findDefaultPlan() {
    const query: any = {
      search: this.config.defaultPlan.name,
      page: '1',
      limit: '10',
    };

    if (this.config.defaultPlan.criteria?.isActive !== undefined) {
      query.isActive = this.config.defaultPlan.criteria.isActive;
    }

    const result = await this.subscriptionPlansService.findAll(query);

    if (!result.data || result.data.length === 0) {
      throw new Error(`Default plan '${this.config.defaultPlan.name}' not found`);
    }

    const plans = result.data as any[];
    const plan = plans.find(
      (p) => p.name === this.config.defaultPlan.name
    );

    if (!plan) {
      throw new Error(`Default plan '${this.config.defaultPlan.name}' not found`);
    }

    return plan;
  }

  private async createDefaultSubscription(job: Job): Promise<JobResult> {
    try {
      this.validateJobData(job, ['organizationId']);
      const { organizationId } = job.data;

      await this.updateProgress(job, 5, 'Checking for existing subscriptions');

      // Check if organization already has a subscription (TRIAL or ACTIVE)
      const existingSubscription = await this.subscriptionsService.findActiveSubscriptionByOrganizationId(organizationId);
      
      if (existingSubscription) {
        this.logger.log(
          `Organization ${organizationId} already has an existing subscription (${existingSubscription.id}, status: ${existingSubscription.status}). Skipping subscription creation.`,
        );
        return this.createSuccessResult({
          organizationId,
          subscriptionId: existingSubscription.id,
          message: 'Subscription already exists, skipped creation',
          skipped: true,
        });
      }

      await this.updateProgress(job, 10, 'Finding default plan');

      await this.transactionManager.execute(async (transaction) => {
        const defaultPlan = await this.findDefaultPlan();

        await this.updateProgress(job, 30, 'Creating subscription');

        const now = moment();
        const trialEndDate = moment(now).add(this.config.defaultPlan.trialPeriodDays, 'days');

        const subscription = await this.subscriptionsService.createSubscription(
          {
            organizationId,
            planId: defaultPlan.id,
            status: SubscriptionStatus.TRIAL,
            billingCycle: BillingCycle.MONTHLY,
            amount: 0,
            currency: Currency.USD,
            trialStart: now.toISOString(),
            trialEnd: trialEndDate.toISOString(),
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: trialEndDate.toISOString(),
            userCount: 1,
            volumeDiscountPercent: 0,
            finalAmount: 0,
          },
          transaction,
        );

        this.logger.log(
          `Created ${defaultPlan.name} plan subscription for organization ${organizationId} with subscription ${subscription.id}`,
        );

        await this.updateProgress(job, 70, 'Generating trial invoice');

        const invoice = await this.invoiceGenerationService.generateTrialInvoice(
          organizationId,
          subscription.id,
          transaction,
        );

        this.logger.log(
          `Generated trial invoice ${invoice.invoiceNumber} ($0) for organization ${organizationId} and subscription ${subscription.id}`,
        );
      });

      await this.updateProgress(job, 100, 'Subscription and invoice created successfully');

      return this.createSuccessResult({
        organizationId,
        message: 'Default subscription and invoice created successfully',
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to create default subscription for organization ${job.data.organizationId}:`,
        error,
      );
      return this.createErrorResult(error);
    }
  }
}

