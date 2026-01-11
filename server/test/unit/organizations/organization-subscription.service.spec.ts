import { Logger } from '@nestjs/common';
import { OrganizationSubscriptionService } from 'src/resources/organizations/services/organization-subscription.service';
import { SubscriptionsService } from 'src/resources/subscriptions/subscriptions.service';
import { SubscriptionPlansService } from 'src/resources/subscriptions/subscription-plans.service';
import { SubscriptionPlan } from 'src/resources/subscriptions/entities/subscription-plan.entity';
import { SubscriptionStatus, BillingCycle, Currency } from 'src/resources/subscriptions/entities/subscription.entity';
import { createMockSubscriptionsService, createMockSubscriptionPlansService } from '../../utils/test-mocks';

describe('OrganizationSubscriptionService', () => {
  let service: OrganizationSubscriptionService;
  let mockSubscriptionsService: jest.Mocked<Partial<SubscriptionsService>>;
  let mockSubscriptionPlansService: jest.Mocked<Partial<SubscriptionPlansService>>;

  beforeEach(() => {
    mockSubscriptionsService = createMockSubscriptionsService();
    mockSubscriptionPlansService = createMockSubscriptionPlansService();

    service = new OrganizationSubscriptionService(
      mockSubscriptionsService as unknown as SubscriptionsService,
      mockSubscriptionPlansService as unknown as SubscriptionPlansService,
    );

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('validateDefaultPlan', () => {
    it('should return valid when default plan is found and active', async () => {
      const mockPlan: Partial<SubscriptionPlan> = {
        id: 'plan-id',
        name: 'Basic',
        isActive: true,
        isPublic: true,
        priceMonthly: 0,
      };

      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [mockPlan],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.validateDefaultPlan();

      expect(result.isValid).toBe(true);
      expect(result.message).toContain('Basic');
      expect(result.plan).toBeDefined();
    });

    it('should return invalid when plan is not found', async () => {
      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await service.validateDefaultPlan();

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return invalid when plan is not active', async () => {
      const mockPlan: Partial<SubscriptionPlan> = {
        id: 'plan-id',
        name: 'Basic',
        isActive: false,
      };

      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [mockPlan],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.validateDefaultPlan();

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not active');
    });

    it('should warn when plan is not public', async () => {
      const mockPlan: Partial<SubscriptionPlan> = {
        id: 'plan-id',
        name: 'Basic',
        isActive: true,
        isPublic: false,
        priceMonthly: 0,
      };

      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [mockPlan],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.validateDefaultPlan();

      expect(result.isValid).toBe(true);
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('createDefaultSubscription', () => {
    it('should create subscription with trial period', async () => {
      const mockPlan: Partial<SubscriptionPlan> = {
        id: 'plan-id',
        name: 'Basic',
        priceMonthly: 0,
      };

      const mockSubscription = {
        id: 'sub-id',
        organizationId: 'org-id',
        planId: 'plan-id',
      };

      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [mockPlan],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      mockSubscriptionsService.createSubscription = jest.fn().mockResolvedValue(mockSubscription as any);

      await service.createDefaultSubscription('org-id');

      expect(mockSubscriptionsService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-id',
          planId: 'plan-id',
          status: SubscriptionStatus.TRIAL,
          billingCycle: BillingCycle.MONTHLY,
          amount: 0,
          currency: Currency.USD,
        })
      );

      const callArgs = (mockSubscriptionsService.createSubscription as jest.Mock).mock.calls[0][0];
      expect(callArgs.trialStart).toBeDefined();
      expect(callArgs.trialEnd).toBeDefined();
      expect(callArgs.currentPeriodStart).toBeDefined();
      expect(callArgs.currentPeriodEnd).toBeDefined();
    });

    it('should not throw error if subscription creation fails', async () => {
      const mockPlan: Partial<SubscriptionPlan> = {
        id: 'plan-id',
        name: 'Basic',
        priceMonthly: 0,
      };

      mockSubscriptionPlansService.findAll = jest.fn().mockResolvedValue({
        data: [mockPlan],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      mockSubscriptionsService.createSubscription = jest.fn().mockRejectedValue(new Error('Creation failed'));

      await expect(service.createDefaultSubscription('org-id')).resolves.not.toThrow();
    });
  });

  describe('upgradeSubscription', () => {
    it('should cancel current subscription and create new one', async () => {
      const currentSubscription = {
        id: 'current-sub-id',
        organizationId: 'org-id',
        planId: 'old-plan-id',
      };

      const newPlan: Partial<SubscriptionPlan> = {
        id: 'new-plan-id',
        name: 'Premium',
        priceMonthly: 100,
      };

      mockSubscriptionsService.findActiveSubscriptionByOrganizationId = jest
        .fn()
        .mockResolvedValue(currentSubscription as any);
      mockSubscriptionsService.cancelSubscription = jest.fn().mockResolvedValue(undefined);
      mockSubscriptionPlansService.findSubscriptionPlanById = jest.fn().mockResolvedValue(newPlan as SubscriptionPlan);
      mockSubscriptionsService.createSubscription = jest.fn().mockResolvedValue({
        id: 'new-sub-id',
      } as any);

      await service.upgradeSubscription('org-id', 'new-plan-id');

      expect(mockSubscriptionsService.cancelSubscription).toHaveBeenCalledWith(
        'current-sub-id',
        'Upgraded to new plan'
      );
      expect(mockSubscriptionsService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-id',
          planId: 'new-plan-id',
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          amount: 100,
          currency: Currency.USD,
        })
      );
    });

    it('should create new subscription even if no current subscription exists', async () => {
      const newPlan: Partial<SubscriptionPlan> = {
        id: 'new-plan-id',
        name: 'Premium',
        priceMonthly: 100,
      };

      mockSubscriptionsService.findActiveSubscriptionByOrganizationId = jest.fn().mockResolvedValue(null);
      mockSubscriptionPlansService.findSubscriptionPlanById = jest.fn().mockResolvedValue(newPlan as SubscriptionPlan);
      mockSubscriptionsService.createSubscription = jest.fn().mockResolvedValue({
        id: 'new-sub-id',
      } as any);

      await service.upgradeSubscription('org-id', 'new-plan-id');

      expect(mockSubscriptionsService.cancelSubscription).not.toHaveBeenCalled();
      expect(mockSubscriptionsService.createSubscription).toHaveBeenCalled();
    });

    it('should throw error if upgrade fails', async () => {
      mockSubscriptionsService.findActiveSubscriptionByOrganizationId = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.upgradeSubscription('org-id', 'new-plan-id')).rejects.toThrow('Database error');
    });
  });
});

