import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogRepository } from './audit-logs.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [SequelizeModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogRepository],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
