import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Logger,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ResourceService } from '../services/resource.service';
import { CreateResourceDto } from '../dto/resource/create-resource.dto';
import { Resource } from '../entities/resource.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';

@Controller('resources')
export class ResourceController {
  private readonly logger = new Logger(ResourceController.name);

  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  async create(
    @Body() createResourceDto: CreateResourceDto,
  ): Promise<Resource> {
    this.logger.log('Creating resource', {
      action: 'CREATE_RESOURCE',
      data: createResourceDto,
    });
    const resource = await this.resourceService.create(createResourceDto);
    this.logger.log('Resource created', {
      action: 'RESOURCE_CREATED',
      resourceId: resource.id,
    });
    return resource;
  }

  @Get()
  async findAll(@Query() query: PaginationOptions): Promise<Resource[]> {
    this.logger.log('Fetching resources', {
      action: 'GET_RESOURCES',
      filters: query,
    });
    return this.resourceService.findAll(query);
  }

  // Specific routes BEFORE generic :id routes

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string): Promise<Resource> {
    this.logger.log('Force deleting resource', {
      action: 'FORCE_DELETE_RESOURCE',
      resourceId: id,
    });
    return this.resourceService.permanentlyDeleteResource(id);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string): Promise<Resource> {
    this.logger.log('Restoring resource', {
      action: 'RESTORE_RESOURCE',
      resourceId: id,
    });
    return this.resourceService.restoreResource(id);
  }

  // Generic :id routes come LAST

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Resource> {
    this.logger.log('Fetching resource by id', {
      action: 'GET_RESOURCE',
      resourceId: id,
    });
    return this.resourceService.findResourceById(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Resource> {
    this.logger.log('Deleting resource', {
      action: 'DELETE_RESOURCE',
      resourceId: id,
    });
    return this.resourceService.removeResource(id);
  }
}
