import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogRepository } from './audit-logs.repository';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { BaseService } from 'src/common/services/base.service';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuditLogsService extends BaseService<AuditLog> {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    @InjectModel(AuditLog)
    private readonly auditLogModel: typeof AuditLog,
  ) {
    super(auditLogRepository);
  }

  async createAuditLog(
    createAuditLogDto: CreateAuditLogDto,
  ): Promise<AuditLog> {
    // Convert string date to Date object if provided
    const { eventTimestamp, ...restData } = createAuditLogDto;
    const auditLogData: Partial<AuditLog> = {
      ...restData,
    };

    if (eventTimestamp) {
      auditLogData.eventTimestamp = new Date(eventTimestamp);
    } else {
      auditLogData.eventTimestamp = new Date();
    }

    return this.auditLogRepository.create(auditLogData, undefined);
  }

  async findAll(query?: AuditLogQueryDto) {
    const whereConditions: any = {};

    // Add action filter if provided
    if (query?.action) {
      whereConditions.action = query.action;
    }

    // Add module filter if provided
    if (query?.module) {
      whereConditions.module = query.module;
    }

    // Add organization filter if provided
    if (query?.organizationId) {
      whereConditions.organizationId = query.organizationId;
    }

    // Add performed by user filter if provided
    if (query?.performedByUserId) {
      whereConditions.performedByUserId = query.performedByUserId;
    }

    // Add record ID filter if provided
    if (query?.recordId) {
      whereConditions.recordId = query.recordId;
    }

    // Add date range filters if provided
    if (query?.fromDate) {
      whereConditions.eventTimestamp = {
        ...whereConditions.eventTimestamp,
        [Op.gte]: new Date(query.fromDate),
      };
    }

    if (query?.toDate) {
      whereConditions.eventTimestamp = {
        ...whereConditions.eventTimestamp,
        [Op.lte]: new Date(query.toDate),
      };
    }

    // Use model directly for include support
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      sortOrder = 'DESC',
    } = query || {};

    const offset = (page - 1) * limit;

    // Add search conditions if searchTerm is provided
    let searchConditions = whereConditions;
    if (searchTerm) {
      searchConditions = {
        ...whereConditions,
        [Op.or]: [
          { module: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } },
        ],
      };
    }

    const { rows, count } = await this.auditLogModel.findAndCountAll({
      where: searchConditions,
      include: [
        {
          model: User,
          as: 'performedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl'],
          required: false,
        },
      ],
      limit,
      offset,
      order: [['eventTimestamp', sortOrder]],
      raw: false,
      nest: true,
    });

    // Convert Sequelize instances to plain objects to avoid serialization issues
    const plainRows = rows.map((row: any) => row.get({ plain: true }));

    return {
      data: plainRows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findAuditLogById(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'performedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl'],
          required: false,
        },
      ],
      raw: false,
      nest: true,
    });
    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    // Convert Sequelize instance to plain object to avoid serialization issues
    return auditLog.get({ plain: true }) as AuditLog;
  }

  async updateAuditLog(
    id: string,
    updateAuditLogDto: UpdateAuditLogDto,
  ): Promise<AuditLog> {
    const auditLog = await this.findAuditLogById(id);

    // Convert string date to Date object if provided
    const { eventTimestamp, ...restData } = updateAuditLogDto;
    const updateData: Partial<AuditLog> = {
      ...restData,
    };

    if (eventTimestamp) {
      updateData.eventTimestamp = new Date(eventTimestamp);
    }

    const affectedCount = await this.auditLogRepository.update(
      { id },
      updateData,
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return this.findAuditLogById(id);
  }

  // Soft delete audit log (default behavior)
  // Note: remove, permanentlyDelete, and restore methods are inherited from BaseService
  // Use softDelete, hardDelete, and restore methods from BaseService instead

  async updateAction(auditLogId: string, action: string): Promise<AuditLog> {
    const affectedCount = await this.auditLogRepository.update(
      { id: auditLogId },
      { action: action as AuditAction },
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Audit log with ID ${auditLogId} not found`);
    }

    return this.findAuditLogById(auditLogId);
  }

  async getAuditStats(
    organizationId?: string,
    module?: string,
    action?: AuditAction,
  ) {
    const whereConditions: any = {};

    if (organizationId) {
      whereConditions.organizationId = organizationId;
    }

    if (module) {
      whereConditions.module = module;
    }

    if (action) {
      whereConditions.action = action;
    }

    const auditLogs = await this.auditLogModel.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'performedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
      raw: false,
      nest: true,
    });

    if (!auditLogs || auditLogs.length === 0) {
      return {
        total: 0,
        actionDistribution: {},
        moduleDistribution: {},
        organizationDistribution: {},
      };
    }

    // Convert Sequelize instances to plain objects
    const plainAuditLogs = auditLogs.map((log: any) => log.get({ plain: true }));
    const total = plainAuditLogs.length;

    // Action distribution
    const actionDistribution = {};
    plainAuditLogs.forEach((auditLog: any) => {
      actionDistribution[auditLog.action] =
        (actionDistribution[auditLog.action] || 0) + 1;
    });

    // Module distribution
    const moduleDistribution = {};
    plainAuditLogs.forEach((auditLog: any) => {
      moduleDistribution[auditLog.module] =
        (moduleDistribution[auditLog.module] || 0) + 1;
    });

    // Organization distribution
    const organizationDistribution = {};
    plainAuditLogs.forEach((auditLog: any) => {
      const orgId = auditLog.organizationId || 'No Organization';
      organizationDistribution[`Organization ${orgId}`] =
        (organizationDistribution[`Organization ${orgId}`] || 0) + 1;
    });

    return {
      total,
      actionDistribution,
      moduleDistribution,
      organizationDistribution,
    };
  }

  async getEmployeeAuditHistory(employeeId: string) {
    const auditLogs = await this.auditLogModel.findAll({
      where: { performedByUserId: employeeId },
      include: [
        {
          model: User,
          as: 'performedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
      raw: false,
      nest: true,
    });

    if (!auditLogs || auditLogs.length === 0) {
      return {
        totalActions: 0,
        actionHistory: [],
        moduleDistribution: {},
        recentActivity: [],
      };
    }

    // Convert Sequelize instances to plain objects
    const plainAuditLogs = auditLogs.map((log: any) => log.get({ plain: true }));
    const totalActions = plainAuditLogs.length;

    // Module distribution
    const moduleDistribution = {};
    plainAuditLogs.forEach((auditLog: any) => {
      moduleDistribution[auditLog.module] =
        (moduleDistribution[auditLog.module] || 0) + 1;
    });

    // Recent activity (last 10 actions)
    const recentActivity = plainAuditLogs
      .sort(
        (a: any, b: any) =>
          new Date(b.eventTimestamp).getTime() -
          new Date(a.eventTimestamp).getTime(),
      )
      .slice(0, 10);

    return {
      totalActions,
      actionHistory: plainAuditLogs.sort(
        (a: any, b: any) =>
          new Date(b.eventTimestamp).getTime() -
          new Date(a.eventTimestamp).getTime(),
      ),
      moduleDistribution,
      recentActivity,
    };
  }
}
