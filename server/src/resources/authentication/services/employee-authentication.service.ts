import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from 'src/configuration/jwt/jwt.service';
import { EmployeesService } from 'src/resources/employees/employees.service';
import { Employee, EmployeeStatus } from 'src/resources/employees/entities/employee.entity';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';
import { UserRole } from 'src/common/enums/roles.enum';

export interface EmployeeLoginDto {
  email: string;
  password: string;
}

export interface EmployeeAuthResponse {
  access_token: string;
  refresh_token: string;
  employee: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
        role: UserRole;
    type: 'employee';
  };
}

@Injectable()
export class EmployeeAuthenticationService {
  private readonly logger = new Logger(EmployeeAuthenticationService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly employeesService: EmployeesService,
  ) {}

  /**
   * Authenticate employee with email and password
   */
  async login(loginDto: EmployeeLoginDto): Promise<EmployeeAuthResponse> {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Find employee by email
    const employee = await this.employeesService.findByEmail(email);

    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if employee is active
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new UnauthorizedException('Employee account is not active');
    }

    // Verify password
    const isPasswordValid = await this.employeesService.verifyPassword(
      password,
      employee.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login (bypasses SUPERADMIN check)
    await this.employeesService.updateLastLogin(employee.id);

    // Build JWT payload
    const payload = this.buildJwtPayload(employee);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens(payload);

    this.logger.log(`Employee logged in: ${employee.email} (${employee.role})`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
        type: 'employee',
      },
    };
  }

  /**
   * Build JWT payload for employee
   */
  private buildJwtPayload(employee: Employee): JwtPayload {
    return {
      sub: employee.id,
      email: employee.email,
      role: employee.role as UserRole,
      type: 'employee',
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatarUrl: employee.avatarUrl,
      // No organizationId initially - will be selected in dashboard
    };
  }

  /**
   * Select organization for employee (deprecated - no longer updates JWT)
   * Organization selection is now handled via query parameters
   * @deprecated This method is kept for backward compatibility but no longer updates JWT
   */
  async selectOrganization(
    employeeId: string,
    organizationId: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const employee = await this.employeesService.findEmployeeById(employeeId);

    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    // Build JWT payload (no longer includes selectedOrganizationId)
    const payload = this.buildJwtPayload(employee);

    // Generate new tokens (organization selection now handled via query params)
    const tokens = await this.jwtService.generateTokens(payload);

    this.logger.log(
      `Employee ${employee.email} selected organization: ${organizationId} (now using query params)`,
    );

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }
}

