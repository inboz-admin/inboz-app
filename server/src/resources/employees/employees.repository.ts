import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from './entities/employee.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class EmployeesRepository extends BaseRepository<Employee> {
  constructor(
    @InjectModel(Employee)
    employeeModel: typeof Employee,
    userContextService: UserContextService,
  ) {
    super(employeeModel, undefined, userContextService);
  }

  // Employees are platform-level, so we always bypass tenant filtering
  protected supportsTenantFiltering(): boolean {
    return false; // Employees table has no organizationId
  }
}


