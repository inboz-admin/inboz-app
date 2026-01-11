import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmployeesRepository } from './employees.repository';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { BaseService } from 'src/common/services/base.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { CryptoUtilityService } from 'src/common/services/crypto-utility.service';
import { EmailQueue } from 'src/configuration/bull/queues/email.queue';
import { UserRole } from 'src/common/enums/roles.enum';

@Injectable()
export class EmployeesService extends BaseService<Employee> {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly transactionManager: TransactionManager,
    private readonly userContextService: UserContextService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly emailQueue: EmailQueue,
  ) {
    super(employeesRepository);
  }

  /**
   * Check if current user is SUPERADMIN
   */
  private isSuperAdmin(): boolean {
    const currentUser = this.userContextService.getCurrentUser();
    return currentUser?.role === UserRole.SUPERADMIN;
  }

  /**
   * Hash password using CryptoUtilityService
   */
  private async hashPassword(password: string): Promise<string> {
    return this.cryptoUtilityService.encryptPassword(password);
  }

  /**
   * Verify password using CryptoUtilityService
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return this.cryptoUtilityService.verifyPassword(plainPassword, hashedPassword);
  }

  async findAll(query?: EmployeeQueryDto) {
    // Only SUPERADMIN and SUPPORT can view employees
    const currentUser = this.userContextService.getCurrentUser();
    if (!currentUser || (currentUser.role !== UserRole.SUPERADMIN && currentUser.role !== UserRole.SUPPORT)) {
      throw new ForbiddenException('Only SUPERADMIN and SUPPORT can view employees');
    }

    const whereConditions = Object.fromEntries(
      Object.entries({
        role: query?.role,
        status: query?.status,
      }).filter(([_, value]) => value !== undefined),
    );

    return this.employeesRepository.findAll({
      where: whereConditions,
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        searchTerm: query?.search || '',
        searchFields: ['email', 'firstName', 'lastName'],
        sortBy: 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
      bypassTenantFilter: true, // Employees are platform-level
    });
  }

  async findEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee as Employee;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const employee = await this.employeesRepository.findOne({
      where: { email },
    });
    return employee as Employee | null;
  }

  async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Only SUPERADMIN can create employees
    if (!this.isSuperAdmin()) {
      throw new ForbiddenException('Only SUPERADMIN can create employees');
    }

    return this.transactionManager.execute(async (transaction) => {
      // Check if employee with email already exists
      const existingEmployee = await this.findByEmail(createEmployeeDto.email);
      if (existingEmployee) {
        throw new ConflictException(`Employee with email ${createEmployeeDto.email} already exists`);
      }

      // Generate password if not provided
      let password = createEmployeeDto.password;
      let isPasswordGenerated = false;
      if (!password || password.trim() === '') {
        password = this.cryptoUtilityService.generateDefaultPassword(12);
        isPasswordGenerated = true;
        this.logger.log(`Auto-generated password for employee: ${createEmployeeDto.email}`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      const employeeData = {
        ...createEmployeeDto,
        passwordHash,
        status: createEmployeeDto.status || EmployeeStatus.ACTIVE,
      };

      // Remove password from DTO before creating
      delete (employeeData as any).password;

      const employee = await this.employeesRepository.create(
        employeeData,
        transaction,
      );

      this.logger.log(`Employee created: ${employee.email} with role ${employee.role}`);

      // Queue email with credentials (always send, whether password was provided or auto-generated)
      try {
        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
        await this.emailQueue.sendEmployeeCredentials(
          employee.email,
          fullName,
          employee.email,
          password,
        );
        this.logger.log(`Credentials email queued for: ${employee.email}`);
      } catch (error) {
        // Log error but don't fail the employee creation
        this.logger.error(`Failed to queue credentials email for ${employee.email}:`, error);
      }

      return employee;
    });
  }

  /**
   * Update last login timestamp (bypasses SUPERADMIN check)
   * Used during authentication
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.employeesRepository.update(
      { id },
      { lastLoginAt: new Date() },
      undefined, // transaction
      undefined, // currentUserId
      true, // bypassTenantFilter (employees don't have tenant filtering anyway)
    );
  }

  /**
   * Update employee password (bypasses SUPERADMIN check)
   * Used for password reset - allows employees to update their own password
   */
  async updatePassword(id: string, newPassword: string, transaction?: any): Promise<void> {
    const passwordHash = await this.hashPassword(newPassword);
    
    await this.employeesRepository.update(
      { id },
      { passwordHash },
      transaction,
      undefined, // currentUserId
      true, // bypassTenantFilter
    );
  }

  /**
   * Update employee's own profile (bypasses SUPERADMIN check)
   * Allows employees to update their own profile fields (firstName, lastName, email, avatarUrl, settings)
   * Employees cannot update role, status, or other sensitive fields
   */
  async updateOwnProfile(updateProfileDto: UpdateProfileDto): Promise<Employee> {
    return this.transactionManager.execute(async (transaction) => {
      const currentUser = this.userContextService.getCurrentUser();
      
      if (!currentUser || currentUser.type !== 'employee') {
        throw new ForbiddenException('Employee authentication required');
      }

      // For employees, sub is the employee ID
      const employeeId = currentUser.sub;
      
      // Fetch current employee
      const currentEmployee = await this.employeesRepository.findOne({
        where: { id: employeeId },
        transaction,
      }) as Employee | null;

      if (!currentEmployee) {
        throw new NotFoundException('Employee not found');
      }

      const updateData: any = { ...updateProfileDto };

      // Check email uniqueness if email is being changed
      if (updateData.email && updateData.email !== currentEmployee.email) {
        const existingEmployee = await this.findByEmail(updateData.email);
        if (existingEmployee && existingEmployee.id !== employeeId) {
          throw new ConflictException(`Employee with email ${updateData.email} already exists`);
        }
      }

      // Remove any fields that employees shouldn't be able to update
      delete updateData.role;
      delete updateData.status;
      delete updateData.password;
      delete updateData.passwordHash;
      delete updateData.lastLoginAt;

      try {
        const affectedCount = await this.employeesRepository.update(
          { id: employeeId },
          updateData,
          transaction,
          undefined,
          true, // bypassTenantFilter
        );

        if (affectedCount === 0) {
          throw new NotFoundException(`Employee with ID ${employeeId} not found`);
        }

        return this.findEmployeeById(employeeId);
      } catch (error) {
        // Handle unique constraint violation from database
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(`Employee with email ${updateData.email || currentEmployee.email} already exists`);
        }
        throw error;
      }
    });
  }

  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    // Only SUPERADMIN can update employees
    if (!this.isSuperAdmin()) {
      throw new ForbiddenException('Only SUPERADMIN can update employees');
    }

    return this.transactionManager.execute(async (transaction) => {
      const currentEmployee = await this.employeesRepository.findOne({
        where: { id },
        transaction,
      }) as Employee | null;

      if (!currentEmployee) {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }

      const updateData: any = { ...updateEmployeeDto };

      // Check email uniqueness if email is being changed
      if (updateData.email && updateData.email !== currentEmployee.email) {
        const existingEmployee = await this.findByEmail(updateData.email);
        if (existingEmployee && existingEmployee.id !== id) {
          throw new ConflictException(`Employee with email ${updateData.email} already exists`);
        }
      }

      // Hash password if provided
      if (updateData.password) {
        updateData.passwordHash = await this.hashPassword(updateData.password);
        delete updateData.password;
      }

      try {
        const affectedCount = await this.employeesRepository.update(
          { id },
          updateData,
          transaction,
          undefined,
          true, // bypassTenantFilter
        );

        if (affectedCount === 0) {
          throw new NotFoundException(`Employee with ID ${id} not found`);
        }

        return this.findEmployeeById(id);
      } catch (error) {
        // Handle unique constraint violation from database
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(`Employee with email ${updateData.email || currentEmployee.email} already exists`);
        }
        throw error;
      }
    });
  }

  async removeEmployee(id: string): Promise<Employee> {
    // Only SUPERADMIN can delete employees
    if (!this.isSuperAdmin()) {
      throw new ForbiddenException('Only SUPERADMIN can delete employees');
    }

    const employee = await this.findEmployeeById(id);
    await this.employeesRepository.delete({ id }, undefined, undefined, true);
    return employee;
  }

  async permanentlyDeleteEmployee(id: string): Promise<void> {
    // Only SUPERADMIN can permanently delete employees
    if (!this.isSuperAdmin()) {
      throw new ForbiddenException('Only SUPERADMIN can permanently delete employees');
    }

    const employee = await this.findEmployeeById(id);
    await this.employeesRepository.forceDelete({ id }, undefined, undefined, true);
    this.logger.log(`Employee permanently deleted: ${employee.email}`);
  }

  async restoreEmployee(id: string): Promise<Employee> {
    // Only SUPERADMIN can restore employees
    if (!this.isSuperAdmin()) {
      throw new ForbiddenException('Only SUPERADMIN can restore employees');
    }

    await this.employeesRepository.restore({ id }, undefined, undefined, true);
    return this.findEmployeeById(id);
  }
}

