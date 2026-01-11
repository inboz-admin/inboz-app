import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EmailTemplateQueryDto } from './dto/email-template-query.dto';
import { EmailTemplatePreviewDto } from './dto/email-template-preview.dto';

@Controller()
export class EmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {}

  @Post()
  create(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.createEmailTemplate(
      createEmailTemplateDto,
    );
  }

  @Get()
  findAll(@Query() query: EmailTemplateQueryDto) {
    return this.emailTemplatesService.findAll(query);
  }

  @Get('system-templates')
  async getSystemTemplates() {
    return this.emailTemplatesService.findAllSystemTemplates();
  }

  @Get('variables')
  getVariableFields() {
    return {
      variables: this.emailTemplatesService.getVariableFields(),
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailTemplatesService.findEmailTemplateById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.updateEmailTemplate(
      id,
      updateEmailTemplateDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emailTemplatesService.removeEmailTemplate(id);
  }

  @Delete(':id/force')
  forceDelete(@Param('id') id: string) {
    return this.emailTemplatesService.permanentlyDeleteEmailTemplate(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.emailTemplatesService.restoreEmailTemplate(id);
  }


  @Post(':id/preview')
  renderPreview(
    @Param('id') id: string,
    @Body() previewDto: EmailTemplatePreviewDto,
  ) {
    return this.emailTemplatesService.renderPreview(id, previewDto);
  }

  @Patch(':id/increment-usage')
  incrementUsage(@Param('id') id: string) {
    return this.emailTemplatesService.incrementUsageCount(id);
  }
}
