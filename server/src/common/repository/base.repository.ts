import {
  Model,
  ModelStatic,
  Transaction,
  WhereOptions,
  Op,
  CreationAttributes,
} from 'sequelize';
import {
  PaginatedResponse,
  PaginationOptions,
} from 'src/common/interfaces/pagination';
import { BaseQueryDto } from '../dto/base.query.dto';
import { UserContextService } from '../services/user-context.service';

// Single interface for repository operations
export interface IRepository<T> {
  create(
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<T>;

  findOne(options: FindOneOptions<T>): Promise<object | null>;

  findAll(options: RepositoryOptions<T>): Promise<PaginatedResponse<object>>;

  update(
    where: WhereOptions<T>,
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number>;

  delete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number>;

  forceDelete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number>;

  restore(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number>;

  findById(
    id: number | string,
    transaction?: Transaction,
  ): Promise<object | null>;

  searchByField(
    fieldName: keyof T,
    value: any,
    transaction?: Transaction,
  ): Promise<T[]>;
}

export interface RepositoryOptions<T> {
  where?: WhereOptions<T>;
  pagination?: PaginationOptions;
  transaction?: Transaction;
  include?: any[];
  bypassTenantFilter?: boolean; // Only SUPER_ADMIN can bypass tenant filtering - regular admins cannot
  organizationId?: string; // For SUPPORT/SUPERADMIN query param filtering
}

export interface ISearchStrategy<T> {
  buildSearchQuery(
    whereClause: WhereOptions<T>,
    searchFields: string[],
    searchTerm: string,
  ): WhereOptions<T>;
}

export class DefaultSearchStrategy<T> implements ISearchStrategy<T> {
  buildSearchQuery(
    whereClause: WhereOptions<T>,
    searchFields: string[],
    searchTerm: string,
  ): WhereOptions<T> {
    if (!searchTerm || !searchFields.length) return whereClause;

    return {
      ...whereClause,
      [Op.or]: searchFields.map((field) => ({
        [field]: { [Op.like]: `%${searchTerm}%` },
      })) as WhereOptions<T>[],
    };
  }
}

interface FindOneOptions<T> {
  where: WhereOptions<T>;
  transaction?: Transaction;
  include?: any[];
  attributes?: string[];
}

export abstract class BaseRepository<T extends Model>
  implements IRepository<T>
{
  private searchStrategy: ISearchStrategy<T>;
  protected userContextService?: UserContextService;

  constructor(
    protected readonly model: any,
    searchStrategy: ISearchStrategy<T> = new DefaultSearchStrategy<T>(),
    userContextService?: UserContextService,
  ) {
    this.model = model;
    this.searchStrategy = searchStrategy;
    this.userContextService = userContextService;
  }

  /**
   * Get current user ID from context or provided parameter
   * Priority: provided parameter > context > undefined
   */
  protected getCurrentUserId(providedUserId?: string): string | undefined {
    if (providedUserId !== undefined) {
      return providedUserId;
    }
    return this.userContextService?.getCurrentUserId();
  }

  /**
   * Get current user's organization ID for tenant filtering
   */
  protected getCurrentUserOrganizationId(): string | undefined {
    const user = this.userContextService?.getCurrentUser();
    if (!user) return undefined;

    // For employees, organization filtering is handled via query parameters, not JWT
    // So we don't return organizationId from JWT for employees

    // For regular users, use organizationId from JWT
    return user.organizationId;
  }

  /**
   * Check if current user is an employee (SUPERADMIN or SUPPORT)
   */
  protected isEmployee(): boolean {
    const user = this.userContextService?.getCurrentUser();
    return user?.type === 'employee';
  }

  /**
   * Check if current user is a super admin (can bypass tenant filtering)
   * Only employees can be SUPERADMIN - regular users cannot
   */
  protected isSuperAdmin(): boolean {
    const user = this.userContextService?.getCurrentUser();
    if (!user) return false;

    // Only employees with SUPERADMIN role can bypass
    return user.type === 'employee' && user.role === 'SUPERADMIN';
  }

  /**
   * Check if the entity supports tenant filtering (has organizationId field)
   */
  protected supportsTenantFiltering(): boolean {
    // Check if the model has an organizationId attribute
    const attributes = this.model.getAttributes();
    return 'organizationId' in attributes;
  }

  /**
   * Apply tenant filtering to where conditions if entity supports it
   * @param whereConditions - Original where conditions
   * @param bypassTenantFilter - If true, attempts to skip tenant filtering (only works for SUPER_ADMIN)
   * @param organizationId - Optional organizationId from query param (for SUPPORT/SUPERADMIN)
   * @returns Modified where conditions with tenant filter applied
   */
  protected applyTenantFilter(
    whereConditions: WhereOptions<T> = {},
    bypassTenantFilter: boolean = false,
    organizationId?: string
  ): WhereOptions<T> {
    // If entity doesn't support tenant filtering, return as is
    if (!this.supportsTenantFiltering()) {
      return whereConditions;
    }

    // Check if user is an employee
    const isEmployee = this.isEmployee();
    const user = this.userContextService?.getCurrentUser();

    // SUPERADMIN employees can bypass when explicitly requested
    const canBypass = bypassTenantFilter && this.isSuperAdmin();

    if (canBypass) {
      return whereConditions;
    }

    // For employees (SUPPORT/SUPERADMIN): use query param if provided, otherwise show all
    if (isEmployee) {
      if (organizationId) {
        // Filter by provided organizationId from query param
        return {
          ...whereConditions,
          organizationId: organizationId
        } as WhereOptions<T>;
      }
      // No organizationId in query param - show all data (no filter)
      return whereConditions;
    }

    // If user is not an employee but organizationId is provided in query param,
    // it means they might be trying to filter (though this shouldn't happen for regular users)
    // For now, we'll ignore query param for regular users and use JWT organizationId

    // For regular users: always filter by their organizationId from JWT
    const userOrgId = this.getCurrentUserOrganizationId();
    if (!userOrgId) {
      // If user has no organization, they shouldn't see any tenant-filtered data
      return { ...whereConditions, organizationId: null } as WhereOptions<T>;
    }

    return {
      ...whereConditions,
      organizationId: userOrgId
    } as WhereOptions<T>;
  }

  async create(
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<T> {
    try {
      // Get current user ID from context or provided parameter
      const effectiveUserId = this.getCurrentUserId(currentUserId);

      // Add audit fields if currentUserId is available
      const auditData = effectiveUserId
        ? { ...data, createdBy: effectiveUserId }
        : data;

      const record = await this.model.create(auditData, {
        transaction,
        raw: true,
      });
      return record.get({ plain: true });
    } catch (error) {
      throw error;
    }
  }

  async findOne(options: FindOneOptions<T>): Promise<object | null> {
    try {
      // Apply tenant filtering to where conditions
      const tenantFilteredWhere = this.applyTenantFilter(options.where);

      const record = await this.model.findOne({
        where: tenantFilteredWhere,
        transaction: options.transaction,
        include: options.include,
        attributes: options.attributes,
        raw: false, // Changed to false to get nested structure
      });
      return record ? record.get({ plain: true }) : null; // Convert Sequelize instance to plain object
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    options: RepositoryOptions<T>,
  ): Promise<PaginatedResponse<object>> {
    try {
      const { where = {}, pagination = {}, transaction, bypassTenantFilter = false, organizationId } = options;

      const {
        page = 1,
        limit = 10,
        searchTerm = '',
        searchFields = [],
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = pagination;

      // Apply tenant filtering first (pass organizationId from query param)
      const tenantFilteredWhere = this.applyTenantFilter(where, bypassTenantFilter, organizationId);

      // Build search query if search term is provided
      let finalWhere = tenantFilteredWhere;
      if (searchTerm && searchFields.length > 0) {
        finalWhere = this.searchStrategy.buildSearchQuery(
          tenantFilteredWhere,
          searchFields,
          searchTerm,
        );
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const total = await this.model.count({
        where: finalWhere,
        transaction,
      });

      // Get paginated data
      const data = await this.model.findAll({
        where: finalWhere,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        transaction,
        include: options.include,
        raw: false, // Changed to false to get nested structure
      });

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((row) => row.get({ plain: true })), // Convert Sequelize instances to plain objects
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  async update(
    where: WhereOptions<T>,
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number> {
    try {
      // Apply tenant filtering to where conditions (no organizationId from query param for update)
      const tenantFilteredWhere = this.applyTenantFilter(where, bypassTenantFilter);

      // Get current user ID from context or provided parameter
      const effectiveUserId = this.getCurrentUserId(currentUserId);

      // Add audit fields if currentUserId is available
      const auditData = effectiveUserId
        ? { ...data, updatedBy: effectiveUserId }
        : data;

      const [affectedCount] = await this.model.update(auditData, {
        where: tenantFilteredWhere,
        transaction,
      });
      return affectedCount;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete - sets deletedAt timestamp
  async delete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number> {
    try {
      // Apply tenant filtering to where conditions (no organizationId from query param for delete)
      const tenantFilteredWhere = this.applyTenantFilter(where, bypassTenantFilter);

      // Get current user ID from context or provided parameter
      const effectiveUserId = this.getCurrentUserId(currentUserId);

      // If currentUserId is available, first update the deletedBy field
      if (effectiveUserId) {
        await this.model.update(
          { deletedBy: effectiveUserId },
          { where: tenantFilteredWhere, transaction, paranoid: false }, // Update even soft deleted records
        );
      }

      const affectedCount = await this.model.destroy({
        where: tenantFilteredWhere,
        transaction,
        // force: false is default, ensures soft delete for paranoid models
      });
      return affectedCount;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete - permanently removes from database
  async forceDelete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number> {
    try {
      // Apply tenant filtering to where conditions (no organizationId from query param for forceDelete)
      const tenantFilteredWhere = this.applyTenantFilter(where, bypassTenantFilter);

      // Get current user ID from context or provided parameter
      const effectiveUserId = this.getCurrentUserId(currentUserId);

      // If currentUserId is available, first update the deletedBy field
      if (effectiveUserId) {
        await this.model.update(
          { deletedBy: effectiveUserId },
          { where: tenantFilteredWhere, transaction, paranoid: false }, // Update even soft deleted records
        );
      }

      const affectedCount = await this.model.destroy({
        where: tenantFilteredWhere,
        transaction,
        force: true, // Force hard delete
      });
      return affectedCount;
    } catch (error) {
      throw error;
    }
  }

  // Restore soft deleted records
  async restore(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
    bypassTenantFilter?: boolean,
  ): Promise<number> {
    try {
      // Apply tenant filtering to where conditions (no organizationId from query param for restore)
      const tenantFilteredWhere = this.applyTenantFilter(where, bypassTenantFilter);

      const affectedCount = await this.model.restore({
        where: tenantFilteredWhere,
        transaction,
      });

      // Get current user ID from context or provided parameter
      const effectiveUserId = this.getCurrentUserId(currentUserId);

      // If currentUserId is available, update the updatedBy field and clear deletedBy
      if (effectiveUserId && affectedCount > 0) {
        await this.model.update(
          { updatedBy: effectiveUserId, deletedBy: null },
          { where: tenantFilteredWhere, transaction },
        );
      }

      return affectedCount;
    } catch (error) {
      throw error;
    }
  }

  async findById(
    id: number | string,
    transaction?: Transaction,
  ): Promise<object | null> {
    try {
      // Apply tenant filtering to ensure users can only access their organization's data
      const tenantFilteredWhere = this.applyTenantFilter({ id } as unknown as WhereOptions<T>);
      
      const record = await this.model.findOne({
        where: tenantFilteredWhere,
        transaction,
        raw: false, // Changed to false to get nested structure
      });
      return record ? record.get({ plain: true }) : null; // Convert Sequelize instance to plain object
    } catch (error) {
      throw error;
    }
  }

  async searchByField(
    fieldName: keyof T,
    value: any,
    transaction?: Transaction,
  ): Promise<T[]> {
    try {
      const records = await this.model.findAll({
        where: {
          [fieldName]: value,
        } as WhereOptions<T>,
        transaction,
        raw: true,
      });
      return records;
    } catch (error) {
      throw error;
    }
  }
}
