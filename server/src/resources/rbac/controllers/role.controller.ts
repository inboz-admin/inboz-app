import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Logger,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { Role } from '../entities/role.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';
import { RequirePermission } from 'src/common/decorators/permissions.decorator';
import { ActionName } from 'src/common/enums/actions.enum';
import { ResourceName } from 'src/common/enums/resources.enum';

@Controller('roles')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    this.logger.log('Creating role', {
      action: 'CREATE_ROLE',
      data: createRoleDto,
    });
    const role = await this.roleService.create(createRoleDto);
    this.logger.log('Role created', {
      action: 'ROLE_CREATED',
      roleId: role.id,
    });
    return role;
  }

  @Get()
  async findAll(@Query() query: PaginationOptions): Promise<Role[]> {
    this.logger.log('Fetching roles', {
      action: 'GET_ROLES',
      filters: query,
    });
    return this.roleService.findAll(query);
  }

  @Get(':rolename/actions/:resource')
  async getActionsByRoleNameAndResource(
    @Param('rolename') rolename: string,
    @Param('resource') resourceName: ResourceName,
  ): Promise<{ actions: ActionName[] }> {
    this.logger.log('Getting actions by role name and resource', {
      action: 'GET_ACTIONS_BY_ROLENAME_RESOURCE',
      rolename,
      resourceName,
    });

    // First find the role by name
    const role = await this.roleService.findByName(rolename);

    // Then get actions for the resource using the role ID
    const actions = await this.roleService.getActionsForResource(
      role.id,
      resourceName,
    );

    return { actions };
  }

  // Specific routes BEFORE generic :id routes

  @Get(':id/permissions')
  async checkPermissions(
    @Param('id') id: string,
    @Body('action') action: ActionName,
    @Body('resource') resource: ResourceName,
  ): Promise<{ hasPermission: boolean }> {
    this.logger.log('Checking permissions', {
      action: 'CHECK_PERMISSIONS',
      roleId: id,
      actionName: action,
      resourceName: resource,
    });
    const hasPermission = await this.roleService.hasPermission(
      id,
      action,
      resource,
    );
    return { hasPermission };
  }

  @Get(':id/actions/:resource')
  async getActionsForResource(
    @Param('id') roleIdentifier: string,
    @Param('resource') resourceName: ResourceName,
  ): Promise<{ actions: ActionName[] }> {
    this.logger.log('Getting actions for resource', {
      action: 'GET_RESOURCE_ACTIONS',
      roleIdentifier,
      resourceName,
    });

    const actions = await this.roleService.getActionsForResource(
      roleIdentifier,
      resourceName,
    );

    return { actions };
  }

  @Get(':id/all-actions')
  async getAllResourceActions(
    @Param('id') roleIdentifier: string,
  ): Promise<Record<ResourceName, ActionName[]>> {
    this.logger.log('Getting all resource actions', {
      action: 'GET_ALL_RESOURCE_ACTIONS',
      roleIdentifier,
    });

    return this.roleService.getAllResourceActions(roleIdentifier);
  }

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string): Promise<Role> {
    this.logger.log('Force deleting role', {
      action: 'FORCE_DELETE_ROLE',
      roleId: id,
    });
    return this.roleService.permanentlyDeleteRole(id);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string): Promise<Role> {
    this.logger.log('Restoring role', {
      action: 'RESTORE_ROLE',
      roleId: id,
    });
    return this.roleService.restoreRole(id);
  }

  // Generic :id routes come LAST

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    this.logger.log('Fetching role by id', {
      action: 'GET_ROLE',
      roleId: id,
    });
    return this.roleService.findRoleById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: CreateRoleDto,
  ): Promise<Role> {
    this.logger.log('Updating role', {
      action: 'UPDATE_ROLE',
      roleId: id,
      data: updateRoleDto,
    });
    return this.roleService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Role> {
    this.logger.log('Deleting role', {
      action: 'DELETE_ROLE',
      roleId: id,
    });
    return this.roleService.removeRole(id);
  }
}
