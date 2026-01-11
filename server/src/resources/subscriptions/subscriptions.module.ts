import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlanRepository } from './subscription-plan.repository';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionRepository } from './subscription.repository';
import { Subscription } from './entities/subscription.entity';
import { InvoicesService } from './invoices.service';
import { InvoiceRepository } from './invoice.repository';
import { Invoice } from './entities/invoice.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { SubscriptionExpiryService } from './services/subscription-expiry.service';
import { SubscriptionRenewalService } from './services/subscription-renewal.service';
import { SubscriptionPaymentService } from './services/subscription-payment.service';
import { PricingCalculationService } from './services/pricing-calculation.service';
import { TrialManagementService } from './services/trial-management.service';
import { ProrationCalculationService } from './services/proration-calculation.service';
import { DateNormalizationService } from './services/date-normalization.service';
import { PeriodCalculationService } from './services/period-calculation.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { PaymentsModule } from 'src/resources/payments/payments.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      SubscriptionPlan,
      Subscription,
      Invoice,
      Organization,
      User,
    ]),
    PaymentsModule,
  ],
  controllers: [
    SubscriptionsController,
  ],
  providers: [
    SubscriptionPlansService,
    SubscriptionPlanRepository,
    SubscriptionsService,
    SubscriptionRepository,
    InvoicesService,
    InvoiceRepository,
    InvoiceGenerationService,
    SubscriptionExpiryService,
    SubscriptionRenewalService,
    SubscriptionPaymentService,
    PricingCalculationService,
    TrialManagementService,
    ProrationCalculationService,
    DateNormalizationService,
    PeriodCalculationService,
    InvoicePdfService,
  ],
  exports: [
    SubscriptionPlansService,
    SubscriptionsService,
    InvoicesService,
    SubscriptionRepository,
    InvoiceRepository,
    InvoiceGenerationService,
    SubscriptionExpiryService,
    SubscriptionRenewalService,
    SubscriptionPaymentService,
    PricingCalculationService,
    TrialManagementService,
    ProrationCalculationService,
  ],
})
export class SubscriptionsModule {}


