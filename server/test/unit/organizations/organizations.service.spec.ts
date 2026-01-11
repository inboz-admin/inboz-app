import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from 'src/resources/organizations/organizations.service';
import { OrganizationRepository } from 'src/resources/organizations/organizations.repository';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { OrganizationValidator } from 'src/resources/organizations/services/organization-validation.service';
import { OrganizationSubscriptionService } from 'src/resources/organizations/services/organization-subscription.service';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { CreateOrganizationDto } from 'src/resources/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from 'src/resources/organizations/dto/update-organization.dto';
import {
  createMockTransactionManager,
  createMockUserContextService,
  createMockOrganizationRepository,
} from '../../utils/test-mocks';
import { createOrganizationDto, createOrganizationEntity, createInactiveOrganization } from '../../utils/test-factories';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockRepository: jest.Mocked<Partial<OrganizationRepository>>;
  let mockTransactionManager: jest.Mocked<TransactionManager>;
  let mockValidator: jest.Mocked<OrganizationValidator>;
  let mockSubscriptionService: jest.Mocked<Partial<OrganizationSubscriptionService>>;

  beforeEach(() => {
    mockRepository = createMockOrganizationRepository();
    mockTransactionManager = createMockTransactionManager();
    mockValidator = {
      validateAndSanitize: jest.fn(),
    } as any;
    mockSubscriptionService = {
      createDefaultSubscription: jest.fn().mockResolvedValue(undefined),
      validateDefaultPlan: jest.fn(),
    } as any;

    service = new OrganizationsService(
      mockRepository as unknown as OrganizationRepository,
      mockTransactionManager,
      mockValidator,
      mockSubscriptionService as unknown as OrganizationSubscriptionService,
    );
  });

  describe('createOrganization', () => {
    it('should create organization with default subscription', async () => {
      const dto = createOrganizationDto();
      const validatedDto = { ...dto };
      const createdOrg = createOrganizationEntity() as Organization;

      mockValidator.validateAndSanitize = jest.fn().mockResolvedValue(validatedDto);
      mockRepository.create = jest.fn().mockResolvedValue(createdOrg);

      const result = await service.createOrganization(dto);

      expect(mockValidator.validateAndSanitize).toHaveBeenCalledWith(dto);
      expect(mockRepository.create).toHaveBeenCalledWith(validatedDto, expect.anything());
      expect(mockSubscriptionService.createDefaultSubscription).toHaveBeenCalledWith(createdOrg.id);
      expect(result).toEqual(createdOrg);
    });

    it('should execute within transaction', async () => {
      const dto = createOrganizationDto();
      const createdOrg = createOrganizationEntity() as Organization;

      mockValidator.validateAndSanitize = jest.fn().mockResolvedValue(dto);
      mockRepository.create = jest.fn().mockResolvedValue(createdOrg);

      await service.createOrganization(dto);

      expect(mockTransactionManager.execute).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated organizations', async () => {
      const orgs = [createOrganizationEntity(), createOrganizationEntity()];
      const paginatedResult = {
        data: orgs,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.findAll = jest.fn().mockResolvedValue(paginatedResult);

      const result = await service.findAll();

      expect(result).toEqual(paginatedResult);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should filter by domain when provided', async () => {
      const query = { domain: 'test.com' };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await service.findAll(query);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'test.com' },
        })
      );
    });

    it('should filter by status when provided', async () => {
      const query = { status: 'ACTIVE' };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await service.findAll(query);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        })
      );
    });

    it('should handle page 0 (passes through to repository - validation should be in repository)', async () => {
      const query = { page: 0 };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 0, limit: 10, totalPages: 0 });

      await service.findAll(query);

      // Service passes through the value - repository should handle validation
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle negative page (passes through to repository)', async () => {
      const query = { page: -1 };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: -1, limit: 10, totalPages: 0 });

      await service.findAll(query);

      // Service passes through the value - repository should handle validation
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle limit 0 (passes through to repository)', async () => {
      const query = { limit: 0 };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 0, totalPages: 0 });

      await service.findAll(query);

      // Service passes through the value - repository should handle validation
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle negative limit (passes through to repository)', async () => {
      const query = { limit: -5 };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: -5, totalPages: 0 });

      await service.findAll(query);

      // Service passes through the value - repository should handle validation
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle very large page numbers', async () => {
      const query = { page: 999999 };
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 999999, limit: 10, totalPages: 0 });

      const result = await service.findAll(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle empty result set', async () => {
      mockRepository.findAll = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('findOrganizationById', () => {
    it('should return organization by ID', async () => {
      const org = createOrganizationEntity() as Organization;
      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      const result = await service.findOrganizationById('org-id');

      expect(result).toEqual(org);
      expect(mockRepository.findByIdOrFail).toHaveBeenCalledWith('org-id');
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      const org = createOrganizationEntity() as Organization;
      mockRepository.findBySlugOrFail = jest.fn().mockResolvedValue(org);

      const result = await service.findBySlug('test-org');

      expect(result).toEqual(org);
      expect(mockRepository.findBySlugOrFail).toHaveBeenCalledWith('test-org');
    });
  });

  describe('findByDomain', () => {
    it('should return organization by domain', async () => {
      const org = createOrganizationEntity() as Organization;
      mockRepository.findByDomainOrFail = jest.fn().mockResolvedValue(org);

      const result = await service.findByDomain('test.com');

      expect(result).toEqual(org);
      expect(mockRepository.findByDomainOrFail).toHaveBeenCalledWith('test.com');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization', async () => {
      const updateDto: UpdateOrganizationDto = { name: 'Updated Name' };
      const updatedOrg = createOrganizationEntity({ name: 'Updated Name' }) as Organization;

      mockValidator.validateAndSanitize = jest.fn().mockResolvedValue(updateDto);
      mockRepository.update = jest.fn().mockResolvedValue(1);
      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(updatedOrg);

      const result = await service.updateOrganization('org-id', updateDto);

      expect(mockValidator.validateAndSanitize).toHaveBeenCalledWith(updateDto, {
        isUpdate: true,
        excludeId: 'org-id',
        transaction: expect.anything(),
      });
      expect(mockRepository.update).toHaveBeenCalledWith({ id: 'org-id' }, updateDto, expect.anything());
      expect(result).toEqual(updatedOrg);
    });

    it('should throw NotFoundException if organization not found', async () => {
      const updateDto: UpdateOrganizationDto = { name: 'Updated Name' };

      mockValidator.validateAndSanitize = jest.fn().mockResolvedValue(updateDto);
      mockRepository.update = jest.fn().mockResolvedValue(0);

      await expect(service.updateOrganization('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('should update organization settings', async () => {
      const org = createOrganizationEntity({ settings: { key1: 'value1' } }) as any;
      const newSettings = { key2: 'value2' };
      const mergedSettings = { ...org.settings, ...newSettings };
      const updatedOrg = { ...org, settings: mergedSettings };

      mockRepository.findByIdOrFail = jest.fn()
        .mockResolvedValueOnce(org) // First call - get organization
        .mockResolvedValueOnce(updatedOrg); // Second call - reload after update
      mockRepository.update = jest.fn().mockResolvedValue([1]);

      const result = await service.updateSettings('org-id', newSettings);

      // Verify repository.update was called with merged settings
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'org-id' },
        { settings: mergedSettings }
      );
      // Verify findByIdOrFail was called twice (get + reload)
      expect(mockRepository.findByIdOrFail).toHaveBeenCalledTimes(2);
      
      // Compare only the relevant properties, excluding methods
      expect(result.settings).toEqual(mergedSettings);
      expect(result.id).toBe(updatedOrg.id);
    });
  });

  describe('removeOrganization', () => {
    it('should soft delete organization if it can be deleted', async () => {
      // Create an INACTIVE organization with old updatedAt (more than 30 days ago)
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const org = createInactiveOrganization({ updatedAt: thirtyOneDaysAgo.toISOString() }) as Organization;

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);
      mockRepository.delete = jest.fn().mockResolvedValue(1);

      const result = await service.removeOrganization('org-id');

      // Verify repository.delete was called
      expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'org-id' });
      expect(result).toEqual(org);
    });

    it('should throw error if organization cannot be deleted', async () => {
      // Create an ACTIVE organization (cannot be deleted)
      const org = createOrganizationEntity({ status: 'ACTIVE' }) as Organization;

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      await expect(service.removeOrganization('org-id')).rejects.toThrow(
        'Organization org-id cannot be deleted - must be INACTIVE'
      );
    });

    it('should throw error if organization has recent activity', async () => {
      // Create an INACTIVE organization but with recent activity (less than 30 days ago)
      // createInactiveOrganization always sets updatedAt to 31 days ago, so we use createOrganizationEntity directly
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      const org = createOrganizationEntity({ 
        status: 'INACTIVE',
        updatedAt: twentyNineDaysAgo.toISOString() 
      }) as Organization;

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      await expect(service.removeOrganization('org-id')).rejects.toThrow(
        'Organization org-id cannot be deleted - has recent activity'
      );
    });
  });

  describe('createOrganization - Transaction Rollback', () => {
    it('should rollback transaction if subscription creation fails', async () => {
      const dto = createOrganizationDto();
      const createdOrg = createOrganizationEntity() as Organization;

      mockValidator.validateAndSanitize = jest.fn().mockResolvedValue(dto);
      mockRepository.create = jest.fn().mockResolvedValue(createdOrg);
      mockSubscriptionService.createDefaultSubscription = jest.fn().mockRejectedValue(
        new Error('Subscription creation failed')
      );

      // Mock transaction to track rollback
      let transactionRolledBack = false;
      mockTransactionManager.execute = jest.fn().mockImplementation(async (callback) => {
        const mockTransaction = {
          rollback: jest.fn().mockImplementation(() => {
            transactionRolledBack = true;
          }),
        };
        try {
          return await callback(mockTransaction);
        } catch (error) {
          mockTransaction.rollback();
          throw error;
        }
      });

      await expect(service.createOrganization(dto)).rejects.toThrow('Subscription creation failed');
      expect(transactionRolledBack).toBe(true);
    });
  });

  describe('permanentlyDeleteOrganization', () => {
    it('should permanently delete organization if it can be deleted', async () => {
      const org = createInactiveOrganization() as Organization;
      org.canBeDeleted = jest.fn().mockReturnValue(true);

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);
      mockRepository.forceDelete = jest.fn().mockResolvedValue(1);

      const result = await service.permanentlyDeleteOrganization('org-id');

      expect(org.canBeDeleted).toHaveBeenCalled();
      expect(mockRepository.forceDelete).toHaveBeenCalledWith({ id: 'org-id' });
      expect(result).toEqual(org);
    });
  });

  describe('restoreOrganization', () => {
    it('should restore deleted organization', async () => {
      const org = createOrganizationEntity() as Organization;

      mockRepository.restore = jest.fn().mockResolvedValue(1);
      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      const result = await service.restoreOrganization('org-id');

      expect(mockRepository.restore).toHaveBeenCalledWith({ id: 'org-id' });
      expect(result).toEqual(org);
    });
  });

  describe('suspendOrganization', () => {
    it('should suspend organization if it can be suspended', async () => {
      const org = createOrganizationEntity({ status: 'ACTIVE' }) as Organization;
      const suspendedOrg = createOrganizationEntity({ status: 'SUSPENDED' }) as Organization;

      org.canBeSuspended = jest.fn().mockReturnValue(true);
      mockRepository.findByIdOrFail = jest.fn().mockResolvedValueOnce(org).mockResolvedValueOnce(suspendedOrg);
      mockRepository.update = jest.fn().mockResolvedValue(1);

      const result = await service.suspendOrganization('org-id', 'Test reason');

      expect(org.canBeSuspended).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'org-id' },
        expect.objectContaining({
          status: 'SUSPENDED',
          settings: expect.objectContaining({
            suspensionReason: 'Test reason',
          }),
        })
      );
      expect(result).toEqual(suspendedOrg);
    });

    it('should throw error if organization cannot be suspended', async () => {
      const org = createOrganizationEntity({ status: 'SUSPENDED' }) as Organization;
      org.canBeSuspended = jest.fn().mockReturnValue(false);

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      await expect(service.suspendOrganization('org-id')).rejects.toThrow(
        'Organization org-id cannot be suspended'
      );
    });
  });

  describe('reactivateOrganization', () => {
    it('should reactivate suspended organization', async () => {
      const suspendedOrg = createOrganizationEntity({ status: 'SUSPENDED' }) as Organization;
      const activeOrg = createOrganizationEntity({ status: 'ACTIVE' }) as Organization;

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValueOnce(suspendedOrg).mockResolvedValueOnce(activeOrg);
      mockRepository.update = jest.fn().mockResolvedValue(1);

      const result = await service.reactivateOrganization('org-id');

      expect(mockRepository.update).toHaveBeenCalledWith({ id: 'org-id' }, { status: 'ACTIVE' });
      expect(result).toEqual(activeOrg);
    });

    it('should throw error if organization is not suspended', async () => {
      const org = createOrganizationEntity({ status: 'ACTIVE' }) as Organization;

      mockRepository.findByIdOrFail = jest.fn().mockResolvedValue(org);

      await expect(service.reactivateOrganization('org-id')).rejects.toThrow(
        'Organization org-id is not suspended'
      );
    });
  });

  describe('validateDefaultPlan', () => {
    it('should delegate to subscription service', async () => {
      const validationResult = { isValid: true, message: 'Valid', plan: {} };
      mockSubscriptionService.validateDefaultPlan = jest.fn().mockResolvedValue(validationResult);

      const result = await service.validateDefaultPlan();

      expect(result).toEqual(validationResult);
      expect(mockSubscriptionService.validateDefaultPlan).toHaveBeenCalled();
    });
  });
});

