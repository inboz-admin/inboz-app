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
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Controller()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post()
  create(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogsService.createAuditLog(createAuditLogDto);
  }

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findAuditLogById(id);
  }

  // Specific routes BEFORE generic :id routes

  @Patch(':id/action')
  updateAction(@Param('id') id: string, @Body('action') action: string) {
    return this.auditLogsService.updateAction(id, action);
  }

  @Delete(':id/force')
  forceDelete(@Param('id') id: string) {
    return this.auditLogsService.hardDelete({ id }, undefined);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.auditLogsService.restore({ id }, undefined);
  }

  // Generic :id routes come LAST

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuditLogDto: UpdateAuditLogDto,
  ) {
    return this.auditLogsService.updateAuditLog(id, updateAuditLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auditLogsService.softDelete({ id }, undefined);
  }

  @Get('stats/audit-stats')
  getAuditStats(
    @Query('organization_id') organizationId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
  ) {
    return this.auditLogsService.getAuditStats(
      organizationId,
      module,
      action as any,
    );
  }

  @Get('user/:userId/history')
  getUserAuditHistory(@Param('userId') userId: string) {
    return this.auditLogsService.getEmployeeAuditHistory(userId);
  }
}
