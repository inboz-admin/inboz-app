import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { RequirePermission } from 'src/common/decorators/permissions.decorator';
import { ResourceName } from 'src/common/enums/resources.enum';
import { ActionName } from 'src/common/enums/actions.enum';

@Controller()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.CREATE)
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(createEmployeeDto);
  }

  @Get()
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.LIST)
  findAll(@Query() query: EmployeeQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Patch('profile')
  updateOwnProfile(@Body() updateProfileDto: UpdateProfileDto) {
    return this.employeesService.updateOwnProfile(updateProfileDto);
  }

  @Get(':id')
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.READ)
  findOne(@Param('id') id: string) {
    return this.employeesService.findEmployeeById(id);
  }

  @Patch(':id')
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.UPDATE)
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.updateEmployee(id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.DELETE)
  remove(@Param('id') id: string) {
    return this.employeesService.removeEmployee(id);
  }

  @Delete(':id/force')
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.DELETE)
  forceDelete(@Param('id') id: string) {
    return this.employeesService.permanentlyDeleteEmployee(id);
  }

  @Post(':id/restore')
  @RequirePermission(ResourceName.EMPLOYEES, ActionName.UPDATE)
  restore(@Param('id') id: string) {
    return this.employeesService.restoreEmployee(id);
  }
}

