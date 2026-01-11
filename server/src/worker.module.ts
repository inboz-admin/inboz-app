import { Module } from '@nestjs/common';
import { ConfigModule } from './configuration/config/config.module';
import { DatabaseModule } from './configuration/database/database.module';
import { LoggerModule } from './configuration/logger/logger.module';
import { CommonModule } from './common/common.module';
import { ExcelModule } from './configuration/excel/excel.module';
import { EmailModule } from './configuration/email/email.module';
import { MulterModule } from './configuration/multer/multer.module';

// Import modules needed by processors
import { ContactsModule } from './resources/contacts/contacts.module';
import { ContactListsModule } from './resources/contact-lists/contact-lists.module';
import { EmailTemplatesModule } from './resources/email-templates/email-templates.module';
import { CampaignsModule } from './resources/campaigns/campaigns.module';
import { WsModule } from './resources/ws/ws.module';

// Import only the worker-related components from BullModule
import { WorkerBullModule } from './configuration/bull/worker-bull.module';

/**
 * Worker Module - Dedicated for processing BullMQ jobs
 *
 * This module:
 * - Does NOT import HTTP/REST controllers
 * - Does NOT start Express/Fastify server
 * - Processes BullMQ jobs from Redis queues
 * - Does NOT run scheduled cron jobs (those are in scheduler.module.ts)
 * - Connects to same Redis as API server
 * - Can be horizontally scaled (multiple instances)
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    CommonModule, // Contains ScheduledTasksService and other services
    ExcelModule,
    EmailModule,
    MulterModule,
    WsModule, // Needed for WebSocket progress updates
    ContactsModule, // Contains SelectionSessionSchedulerService
    ContactListsModule, // Needed for ContactListMemberRepository
    EmailTemplatesModule, // Needed for EmailTemplateRepository
    CampaignsModule, // Needed for campaign entities and repositories
    WorkerBullModule, // Contains ONLY processors (no controllers)
  ],
})
export class WorkerModule {}
