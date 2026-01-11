import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignCrudService } from './services/campaign-crud.service';
import { CampaignStepService } from './services/campaign-step.service';
import { CampaignAnalyticsService } from './services/campaign-analytics.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';

@Controller()
export class CampaignsController {
  constructor(
    private readonly crudService: CampaignCrudService,
    private readonly stepService: CampaignStepService,
    private readonly analyticsService: CampaignAnalyticsService,
    private readonly campaignService: CampaignsService,
  ) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.crudService.create(dto);
  }

  @Get()
  findAll(@Query() query: CampaignQueryDto) {
    return this.crudService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crudService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.crudService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crudService.delete(id);
  }

  @Post(':id/steps')
  addStep(@Param('id') id: string, @Body() dto: CreateStepDto) {
    return this.stepService.add({ ...dto, campaignId: id });
  }

  @Patch(':id/steps/:stepId')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
  ) {
    return this.stepService.update(stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  deleteStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.stepService.delete(id, stepId);
  }

  @Post(':id/steps/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderStepsDto) {
    return this.stepService.reorder(id, dto);
  }

  @Patch(':id/activate')
  activate(
    @Param('id') id: string,
    @Query('quotaMode') quotaMode?: 'auto-spread' | 'restrict',
  ) {
    return this.campaignService.activateCampaign(id, quotaMode || 'auto-spread');
  }

  @Patch(':id/pause')
  pause(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Patch(':id/resume')
  resume(
    @Param('id') id: string,
    @Query('quotaMode') quotaMode?: 'auto-spread' | 'restrict',
  ) {
    return this.campaignService.resumeCampaign(id, quotaMode || 'auto-spread');
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.analyticsService.getCampaignProgress(id);
  }

  @Get(':id/steps/:stepId/emails')
  getStepEmails(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Query('eventType') eventType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.analyticsService.getStepEmails(id, stepId, eventType, pageNum, limitNum, status);
  }
}


