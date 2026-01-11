import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLog } from './entities/audit-log.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(
    @InjectModel(AuditLog)
    auditLogModel: typeof AuditLog,
    userContextService: UserContextService,
  ) {
    super(auditLogModel, undefined, userContextService);
  }
}
