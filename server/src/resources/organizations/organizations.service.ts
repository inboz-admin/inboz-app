import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationRepository } from './organizations.repository';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { OrganizationValidator } from './services/organization-validation.service';
import { SubscriptionQueue } from 'src/configuration/bull/queues/subscription.queue';
import { Transaction, WhereOptions } from 'sequelize';
import { generateUniqueOrgSlug } from 'src/common/utils/slug-generator.util';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly transactionManager: TransactionManager,
    private readonly userContextService: UserContextService,
    private readonly organizationValidator: OrganizationValidator,
    private readonly subscriptionQueue: SubscriptionQueue,
  ) {}

  private async findById(id: string, transaction?: Transaction): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id, transaction);
    if (!organization) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }
    return organization as Organization;
  }

  private mergeSettings(current: Record<string, any> | null, newSettings: Record<string, any>): Record<string, any> {
    return { ...(current || {}), ...newSettings };
  }

  private async updateAndReturn(
    id: string,
    data: Partial<Organization>,
    transaction?: Transaction,
  ): Promise<Organization> {
    const affectedCount = await this.organizationRepository.update(
      { id },
      data,
      transaction
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    const updated = await this.findById(id, transaction);
    return updated;
  }

  async createOrganization(createDto: CreateOrganizationDto): Promise<Organization> {
    const organization = await this.transactionManager.execute(async (transaction) => {
      // Auto-generate slug if not provided
      if (!createDto.slug) {
        createDto.slug = await generateUniqueOrgSlug(transaction);
      }

      const validatedDto = await this.organizationValidator.validateAndSanitize(createDto, {
        transaction,
      });

      const org = await this.organizationRepository.create(validatedDto, transaction);

      this.logger.log(`Created organization: ${org.id}`);
      return org;
    });

    // Queue subscription creation outside transaction (non-blocking, fire-and-forget)
    // This prevents the subscription queue addition from blocking the HTTP response
    this.subscriptionQueue.createDefaultSubscription(organization.id).catch((error) => {
      this.logger.error(
        `Failed to queue subscription creation for organization ${organization.id}:`,
        error,
      );
      // Don't throw - organization is already created, subscription can be created later
    });

    return organization;
  }

  async findAll(query?: OrganizationQueryDto) {
    const currentUser = this.userContextService.getCurrentUser();
    const isEmployee = currentUser?.type === 'employee';
    const queryOrganizationId = query?.organizationId;

    const whereConditions: WhereOptions<Organization> = {};

    if (query?.domain) {
      whereConditions.domain = query.domain;
    }

    // For employees: filter by organizationId query param if provided, otherwise show all
    // For regular users: always filter by their organizationId from JWT
    if (isEmployee) {
      // Employees can see all organizations, or filter by selected organizationId
      if (queryOrganizationId) {
        whereConditions.id = queryOrganizationId;
      }
      // If no queryOrganizationId, show all (no filter on id)
    } else {
      // Regular users should only see their own organization
      const userOrgId = currentUser?.organizationId;
      if (userOrgId) {
        whereConditions.id = userOrgId;
      } else {
        // If user has no organizationId, return empty result
        whereConditions.id = null; // This will return no results
      }
    }

    if (query?.status) {
      whereConditions.status = query.status;
    }

    return this.organizationRepository.findAll({
      where: whereConditions,
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        searchTerm: query?.search || query?.searchTerm || '',
        searchFields: ['name', 'slug', 'domain', 'billingEmail'],
        sortBy: 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
    });
  }

  async findOrganizationById(id: string): Promise<Organization> {
    return this.findById(id);
  }

  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug } as WhereOptions<Organization>,
    });
    if (!organization) {
      throw new NotFoundException(`Organization with slug '${slug}' not found`);
    }
    return organization as Organization;
  }

  async findByDomain(domain: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { domain } as WhereOptions<Organization>,
    });
    if (!organization) {
      throw new NotFoundException(`Organization with domain '${domain}' not found`);
    }
    return organization as Organization;
  }

  async updateOrganization(id: string, updateDto: UpdateOrganizationDto): Promise<Organization> {
    return this.transactionManager.execute(async (transaction) => {
      const validatedDto = await this.organizationValidator.validateAndSanitize(
        updateDto,
        { isUpdate: true, excludeId: id, transaction }
      );

      return this.updateAndReturn(id, validatedDto, transaction);
    });
  }

  async updateSettings(id: string, settings: Record<string, any>): Promise<Organization> {
    return this.transactionManager.execute(async (transaction) => {
      const organization = await this.organizationRepository.findOne({
        where: { id } as WhereOptions<Organization>,
        transaction,
      }) as Organization | null;

      if (!organization) {
        throw new NotFoundException(`Organization with ID '${id}' not found`);
      }

      const mergedSettings = this.mergeSettings(
        organization.settings as Record<string, any> | null,
        settings
      );

      return this.updateAndReturn(id, { settings: mergedSettings }, transaction);
    });
  }

  async removeOrganization(id: string): Promise<Organization> {
    return this.transactionManager.execute(async (transaction) => {
      const organization = await this.findById(id, transaction);
      await this.organizationRepository.delete({ id }, transaction);
      this.logger.log(`Soft deleted organization: ${id}`);
      return organization;
    });
  }

  async permanentlyDeleteOrganization(id: string): Promise<Organization> {
    return this.transactionManager.execute(async (transaction) => {
      const organization = await this.findById(id, transaction);
      await this.organizationRepository.forceDelete({ id }, transaction);
      this.logger.log(`Force deleted organization: ${id}`);
      return organization;
    });
  }

  async restoreOrganization(id: string): Promise<Organization> {
    return this.transactionManager.execute(async (transaction) => {
      await this.organizationRepository.restore({ id }, transaction);
      const restored = await this.findById(id, transaction);
      this.logger.log(`Restored organization: ${id}`);
      return restored;
    });
  }
}
