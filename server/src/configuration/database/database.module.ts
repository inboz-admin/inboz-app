// src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { Role } from 'src/resources/rbac/entities/role.entity';
import { Resource } from 'src/resources/rbac/entities/resource.entity';
import { Action } from 'src/resources/rbac/entities/action.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { AuditLog } from 'src/resources/audit-logs/entities/audit-log.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { EmailTemplate } from 'src/resources/email-templates/entities/email-template.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { EmailMessage } from 'src/resources/campaigns/entities/email-message.entity';
import { EmailTrackingEvent } from 'src/resources/campaigns/entities/email-tracking-event.entity';
import { Employee } from 'src/resources/employees/entities/employee.entity';
import { Notification } from 'src/resources/notifications/entities/notification.entity';
import { PushSubscription } from 'src/resources/notifications/entities/push-subscription.entity';
import { Asset } from 'src/resources/assets/entities/asset.entity';

@Global()
@Module({
  imports: [
    ConfigModule, // Ensure ConfigModule is imported
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        models: [
          User,
          GmailOAuthToken,
          Role,
          Resource,
          Action,
          Organization,
          AuditLog,
          Contact,
          EmailTemplate,
          Campaign,
          CampaignStep,
          EmailMessage,
          EmailTrackingEvent,
          Employee,
          Notification,
          PushSubscription,
          Asset,
        ], // Include all models here
        autoLoadModels: true, // Enable automatic model loading
        synchronize: true, // Enable table creation if they don't exist
        sync: { force: false }, // Don't force sync (which would drop tables)
        pool: {
          max: 10, // Maximum number of connection in pool
          min: 0, // Minimum number of connection in pool
          acquire: 30000, // Maximum time, in milliseconds, that pool will try to get connection before throwing error
          idle: 10000, // Maximum time, in milliseconds, that a connection can be idle before being released
        },
        logging: false, // Disable Sequelize query logging
      }),
    }),
    SequelizeModule.forFeature([
      User,
      Role,
      Resource,
      Action,
      Organization,
      AuditLog,
      GmailOAuthToken,
      Contact,
      EmailTemplate,
      Campaign,
      CampaignStep,
      EmailMessage,
      EmailTrackingEvent,
      Employee,
      Notification,
      PushSubscription,
      Asset,
    ]), // Register all models here
  ],
  providers: [DatabaseService],
  exports: [SequelizeModule, DatabaseService], // Export SequelizeModule to make it available globally
})
export class DatabaseModule {}
