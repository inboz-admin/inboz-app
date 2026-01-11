import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateResourceDto } from '../dto/resource/create-resource.dto';
import { ResourceRepository } from '../repositories/resource.repository';
import { Resource } from '../entities/resource.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';
import { BaseService } from 'src/common/services/base.service';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ResourceService extends BaseService<Resource> {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly userContextService: UserContextService,
  ) {
    super(resourceRepository);
  }

  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    const existingResource = await this.resourceRepository.findOne({
      where: { name: createResourceDto.name },
    });

    if (existingResource) {
      throw new ConflictException(
        `Resource with name ${createResourceDto.name} already exists`,
      );
    }

    const currentUserId = this.userContextService.getCurrentUserId();
    return this.resourceRepository.create(createResourceDto, undefined, currentUserId);
  }

  async findAll(options?: PaginationOptions): Promise<Resource[]> {
    const result = await this.resourceRepository.findAll({
      pagination: {
        ...options,
        searchFields: ['name', 'description'],
      },
    });

    return result.data as Resource[];
  }

  async findResourceById(id: string): Promise<Resource> {
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return resource as Resource;
  }

  async findByName(name: string): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { name },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with name ${name} not found`);
    }
    return resource as Resource;
  }

  // Soft delete resource (default behavior)
  async removeResource(id: string): Promise<Resource> {
    const resource = await this.findResourceById(id);
    await this.softDelete({ id }, undefined);
    return resource;
  }

  // Force delete resource (super admin only - permanent deletion)
  async permanentlyDeleteResource(id: string): Promise<Resource> {
    const resource = await this.findResourceById(id);
    await this.hardDelete({ id }, undefined);
    return resource;
  }

  // Restore soft deleted resource
  async restoreResource(id: string): Promise<Resource> {
    await this.restore({ id }, undefined);
    return this.findResourceById(id);
  }
}
