import { NotFoundException } from '@nestjs/common';
import { OrganizationRepository } from 'src/resources/organizations/organizations.repository';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { createMockUserContextService } from '../../utils/test-mocks';
import { createOrganizationEntity } from '../../utils/test-factories';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let mockModel: any;
  let mockUserContextService: any;

  beforeEach(() => {
    mockUserContextService = createMockUserContextService();
    
    mockModel = {
      count: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      getAttributes: jest.fn().mockReturnValue({}), // Add getAttributes for base repository
    };

    repository = new OrganizationRepository(mockModel, mockUserContextService);
  });

  describe('findBySlugOrFail', () => {
    it('should return organization when found by slug', async () => {
      const org = createOrganizationEntity({ slug: 'test-org' });
      // Mock Sequelize instance with get() method
      const mockSequelizeInstance = {
        get: jest.fn().mockReturnValue(org),
      };
      mockModel.findOne = jest.fn().mockResolvedValue(mockSequelizeInstance);

      const result = await repository.findBySlugOrFail('test-org');

      expect(result).toEqual(org);
      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(repository.findBySlugOrFail('non-existent')).rejects.toThrow(
        NotFoundException
      );
      await expect(repository.findBySlugOrFail('non-existent')).rejects.toThrow(
        "Organization with slug 'non-existent' not found"
      );
    });

    it('should pass transaction when provided', async () => {
      const org = createOrganizationEntity();
      const mockTransaction = {} as any;
      const mockSequelizeInstance = {
        get: jest.fn().mockReturnValue(org),
      };
      mockModel.findOne = jest.fn().mockResolvedValue(mockSequelizeInstance);

      await repository.findBySlugOrFail('test-org', mockTransaction);

      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          transaction: mockTransaction,
        })
      );
    });
  });

  describe('findByDomainOrFail', () => {
    it('should return organization when found by domain', async () => {
      const org = createOrganizationEntity({ domain: 'test.com' });
      const mockSequelizeInstance = {
        get: jest.fn().mockReturnValue(org),
      };
      mockModel.findOne = jest.fn().mockResolvedValue(mockSequelizeInstance);

      const result = await repository.findByDomainOrFail('test.com');

      expect(result).toEqual(org);
      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(repository.findByDomainOrFail('non-existent.com')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByIdOrFail', () => {
    it('should return organization when found by ID', async () => {
      const org = createOrganizationEntity({ id: 'test-id' });
      // Mock the findOne method which is used by findById internally
      mockModel.findOne = jest.fn().mockResolvedValue(org);
      // Access the parent class method
      (repository as any).findById = jest.fn().mockResolvedValue(org);

      const result = await repository.findByIdOrFail('test-id');

      expect(result).toEqual(org);
    });

    it('should throw NotFoundException when organization not found', async () => {
      (repository as any).findById = jest.fn().mockResolvedValue(null);

      await expect(repository.findByIdOrFail('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should pass transaction when provided', async () => {
      const org = createOrganizationEntity();
      const mockTransaction = {} as any;
      (repository as any).findById = jest.fn().mockResolvedValue(org);

      await repository.findByIdOrFail('test-id', mockTransaction);

      expect((repository as any).findById).toHaveBeenCalledWith('test-id', mockTransaction);
    });
  });

  describe('slugExists', () => {
    it('should return true if slug exists', async () => {
      mockModel.count = jest.fn().mockResolvedValue(1);

      const result = await repository.slugExists('existing-slug');

      expect(result).toBe(true);
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { slug: 'existing-slug' },
        transaction: undefined,
      });
    });

    it('should return false if slug does not exist', async () => {
      mockModel.count = jest.fn().mockResolvedValue(0);

      const result = await repository.slugExists('non-existent-slug');

      expect(result).toBe(false);
    });

    it('should exclude ID when provided', async () => {
      mockModel.count = jest.fn().mockResolvedValue(0);

      await repository.slugExists('test-slug', 'exclude-id');

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { slug: 'test-slug', id: { $ne: 'exclude-id' } },
        transaction: undefined,
      });
    });
  });

  describe('domainExists', () => {
    it('should return false if domain is empty', async () => {
      const result = await repository.domainExists('');
      expect(result).toBe(false);
      expect(mockModel.count).not.toHaveBeenCalled();
    });

    it('should return true if domain exists', async () => {
      mockModel.count = jest.fn().mockResolvedValue(1);

      const result = await repository.domainExists('existing.com');

      expect(result).toBe(true);
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { domain: 'existing.com' },
        transaction: undefined,
      });
    });

    it('should exclude ID when provided', async () => {
      mockModel.count = jest.fn().mockResolvedValue(0);

      await repository.domainExists('test.com', 'exclude-id');

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { domain: 'test.com', id: { $ne: 'exclude-id' } },
        transaction: undefined,
      });
    });
  });

  describe('billingEmailExists', () => {
    it('should return false if email is empty', async () => {
      const result = await repository.billingEmailExists('');
      expect(result).toBe(false);
      expect(mockModel.count).not.toHaveBeenCalled();
    });

    it('should return true if billing email exists', async () => {
      mockModel.count = jest.fn().mockResolvedValue(1);

      const result = await repository.billingEmailExists('existing@test.com');

      expect(result).toBe(true);
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { billing_email: 'existing@test.com' },
        transaction: undefined,
      });
    });

    it('should exclude ID when provided', async () => {
      mockModel.count = jest.fn().mockResolvedValue(0);

      await repository.billingEmailExists('test@test.com', 'exclude-id');

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { billing_email: 'test@test.com', id: { $ne: 'exclude-id' } },
        transaction: undefined,
      });
    });
  });
});

