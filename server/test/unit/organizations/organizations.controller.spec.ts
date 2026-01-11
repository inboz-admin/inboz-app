import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from 'src/resources/organizations/organizations.controller';
import { OrganizationsService } from 'src/resources/organizations/organizations.service';
import { CreateOrganizationDto } from 'src/resources/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from 'src/resources/organizations/dto/update-organization.dto';
import { OrganizationQueryDto } from 'src/resources/organizations/dto/organization-query.dto';
import { createOrganizationEntity } from '../../utils/test-factories';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: jest.Mocked<OrganizationsService>;

  beforeEach(async () => {
    const mockService = {
      createOrganization: jest.fn(),
      findAll: jest.fn(),
      findOrganizationById: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      updateOrganization: jest.fn(),
      updateSettings: jest.fn(),
      removeOrganization: jest.fn(),
      permanentlyDeleteOrganization: jest.fn(),
      restoreOrganization: jest.fn(),
      suspendOrganization: jest.fn(),
      reactivateOrganization: jest.fn(),
      validateDefaultPlan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get(OrganizationsService);
  });

  describe('create', () => {
    it('should create organization', async () => {
      const dto: CreateOrganizationDto = {
        name: 'Test Org',
        slug: 'test-org',
      };
      const org = createOrganizationEntity() as any;

      service.createOrganization.mockResolvedValue(org);

      const result = await controller.create(dto);

      expect(service.createOrganization).toHaveBeenCalledWith(dto);
      expect(result).toEqual(org);
    });
  });

  describe('findAll', () => {
    it('should return paginated organizations', async () => {
      const query: OrganizationQueryDto = { page: 1, limit: 10 };
      const result = {
        data: [createOrganizationEntity()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(response).toEqual(result);
    });
  });

  describe('findOne', () => {
    it('should return organization by ID', async () => {
      const org = createOrganizationEntity() as any;
      service.findOrganizationById.mockResolvedValue(org);

      const result = await controller.findOne('org-id');

      expect(service.findOrganizationById).toHaveBeenCalledWith('org-id');
      expect(result).toEqual(org);
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      const org = createOrganizationEntity() as any;
      service.findBySlug.mockResolvedValue(org);

      const result = await controller.findBySlug('test-org');

      expect(service.findBySlug).toHaveBeenCalledWith('test-org');
      expect(result).toEqual(org);
    });
  });

  describe('findByDomain', () => {
    it('should return organization by domain', async () => {
      const org = createOrganizationEntity() as any;
      service.findByDomain.mockResolvedValue(org);

      const result = await controller.findByDomain('test.com');

      expect(service.findByDomain).toHaveBeenCalledWith('test.com');
      expect(result).toEqual(org);
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      const updateDto: UpdateOrganizationDto = { name: 'Updated Name' };
      const org = createOrganizationEntity({ name: 'Updated Name' }) as any;

      service.updateOrganization.mockResolvedValue(org);

      const result = await controller.update('org-id', updateDto);

      expect(service.updateOrganization).toHaveBeenCalledWith('org-id', updateDto);
      expect(result).toEqual(org);
    });
  });

  describe('updateSettings', () => {
    it('should update organization settings', async () => {
      const settings = { key: 'value' };
      const org = createOrganizationEntity({ settings }) as any;

      service.updateSettings.mockResolvedValue(org);

      const result = await controller.updateSettings('org-id', settings);

      expect(service.updateSettings).toHaveBeenCalledWith('org-id', settings);
      expect(result).toEqual(org);
    });
  });

  describe('remove', () => {
    it('should soft delete organization', async () => {
      const org = createOrganizationEntity() as any;
      service.removeOrganization.mockResolvedValue(org);

      const result = await controller.remove('org-id');

      expect(service.removeOrganization).toHaveBeenCalledWith('org-id');
      expect(result).toEqual(org);
    });
  });

  describe('forceDelete', () => {
    it('should permanently delete organization', async () => {
      const org = createOrganizationEntity() as any;
      service.permanentlyDeleteOrganization.mockResolvedValue(org);

      const result = await controller.forceDelete('org-id');

      expect(service.permanentlyDeleteOrganization).toHaveBeenCalledWith('org-id');
      expect(result).toEqual(org);
    });
  });

  describe('restore', () => {
    it('should restore deleted organization', async () => {
      const org = createOrganizationEntity() as any;
      service.restoreOrganization.mockResolvedValue(org);

      const result = await controller.restore('org-id');

      expect(service.restoreOrganization).toHaveBeenCalledWith('org-id');
      expect(result).toEqual(org);
    });
  });

  describe('validateDefaultPlan', () => {
    it('should validate default plan', async () => {
      const result = { isValid: true, message: 'Valid', plan: {} };
      service.validateDefaultPlan.mockResolvedValue(result);

      const response = await controller.validateDefaultPlan();

      expect(service.validateDefaultPlan).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });
});

