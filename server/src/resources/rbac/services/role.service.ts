import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import { ActionRepository } from '../repositories/action.repository';
import { ResourceRepository } from '../repositories/resource.repository';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { Role } from '../entities/role.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';
import { BaseService } from 'src/common/services/base.service';
import {
  RBACUtils,
  PermissionStructure,
} from 'src/common/interfaces/rbac.interface';
import { ActionName } from 'src/common/enums/actions.enum';
import { ResourceName } from 'src/common/enums/resources.enum';

@Injectable()
export class RoleService extends BaseService<Role> {
  private rbacUtils = new RBACUtils();

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly actionRepository: ActionRepository,
    private readonly resourceRepository: ResourceRepository,
  ) {
    super(roleRepository);
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name ${createRoleDto.name} already exists`,
      );
    }

    const role = await this.roleRepository.create(
      {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions,
      },
      undefined,
    );

    return role;
  }

  async findAll(options?: PaginationOptions): Promise<Role[]> {
    const result = await this.roleRepository.findAll({
      pagination: {
        ...options,
        searchFields: ['name', 'description'],
      },
    });

    return result.data as Role[];
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role as Role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name },
    });
    if (!role) {
      throw new NotFoundException(`Role with name ${name} not found`);
    }
    return role as Role;
  }

  async updateRole(id: string, updateRoleDto: CreateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with name ${updateRoleDto.name} already exists`,
        );
      }
    }

    await this.roleRepository.update(
      { id },
      {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        permissions: updateRoleDto.permissions,
      },
      undefined,
    );

    return this.findRoleById(id);
  }

  // Soft delete role (default behavior)
  async removeRole(id: string): Promise<Role> {
    const role = await this.findRoleById(id);
    await this.softDelete({ id }, undefined);
    return role;
  }

  // Force delete role (super admin only - permanent deletion)
  async permanentlyDeleteRole(id: string): Promise<Role> {
    const role = await this.findRoleById(id);
    await this.hardDelete({ id }, undefined);
    return role;
  }

  // Restore soft deleted role
  async restoreRole(id: string): Promise<Role> {
    await this.restore({ id }, undefined);
    return this.findRoleById(id);
  }

  async hasPermission(
    roleId: string,
    actionName: ActionName,
    resourceName: ResourceName,
  ): Promise<boolean> {
    const role = await this.findRoleById(roleId);
    const permissions = role.permissions as PermissionStructure;

    return this.rbacUtils.hasPermission(permissions, resourceName, actionName);
  }

  async getActionsForResource(
    roleIdentifier: string,
    resourceName: ResourceName,
  ): Promise<ActionName[]> {
    // Get the role by ID
    const role = await this.findRoleById(roleIdentifier);

    // Get the resource to validate it exists
    const resource = await this.resourceRepository.findOne({
      where: { name: resourceName },
    });

    if (!resource) {
      throw new NotFoundException(
        `Resource with name ${resourceName} not found`,
      );
    }

    const permissions = role.permissions as PermissionStructure;
    return this.rbacUtils.getActionsForResource(permissions, resourceName);
  }

  async getAllResourceActions(
    roleIdentifier: string,
  ): Promise<Record<ResourceName, ActionName[]>> {
    // Get the role by ID
    const role = await this.findRoleById(roleIdentifier);
    const permissions = role.permissions as PermissionStructure;

    // If role has "ALL" resource permission, get all resources and actions
    if (permissions && permissions[ResourceName.ALL]) {
      const allActions = permissions[ResourceName.ALL];
      const resources = await this.resourceRepository.findAll({});

      // Create a map of all resources with the same actions
      const result: Record<ResourceName, ActionName[]> = {} as Record<
        ResourceName,
        ActionName[]
      >;
      resources.data.forEach((resource: any) => {
        if (resource.name !== ResourceName.ALL) {
          result[resource.name as ResourceName] = [...allActions];
        }
      });

      return result;
    }

    // Return the permissions as is
    return (permissions || {}) as Record<ResourceName, ActionName[]>;
  }
}
