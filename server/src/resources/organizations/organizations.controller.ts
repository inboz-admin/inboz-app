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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationQueryDto } from './dto/organization-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.createOrganization(createOrganizationDto);
  }

  @Get()
  findAll(@Query() query: OrganizationQueryDto) {
    return this.organizationsService.findAll(query);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  @Get('domain/:domain')
  findByDomain(@Param('domain') domain: string) {
    return this.organizationsService.findByDomain(domain);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOrganizationById(id);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() updateSettingsDto: UpdateSettingsDto) {
    return this.organizationsService.updateSettings(id, updateSettingsDto.settings || {});
  }

  @Delete(':id/force')
  forceDelete(@Param('id') id: string) {
    return this.organizationsService.permanentlyDeleteOrganization(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.organizationsService.restoreOrganization(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(
      id,
      updateOrganizationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.removeOrganization(id);
  }
}
