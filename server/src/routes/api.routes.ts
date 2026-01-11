import { Routes } from '@nestjs/core';
import { AuthenticationModule } from '../resources/authentication/authentication.module';
import { RbacModule } from '../resources/rbac/rbac.module';
import { UsersModule } from 'src/resources/users/users.module';
import { OrganizationsModule } from 'src/resources/organizations/organizations.module';
import { ContactsModule } from 'src/resources/contacts/contacts.module';
import { ContactListsModule } from 'src/resources/contact-lists/contact-lists.module';
import { EmailTemplatesModule } from 'src/resources/email-templates/email-templates.module';
import { AuditLogsModule } from 'src/resources/audit-logs/audit-logs.module';
import { BullModule } from 'src/configuration/bull/bull.module';
import { CampaignsModule } from 'src/resources/campaigns/campaigns.module';
import { TrackingModule } from 'src/resources/tracking/tracking.module';
import { SubscriptionsModule } from 'src/resources/subscriptions/subscriptions.module';
import { PaymentsModule } from 'src/resources/payments/payments.module';
import { AnalyticsModule } from 'src/resources/analytics/analytics.module';
import { EmployeesModule } from 'src/resources/employees/employees.module';
import { NotificationsModule } from 'src/resources/notifications/notifications.module';

export const routes: Routes = [
  {
    path: '/api/v1',
    children: [
      {
        path: '/auth',
        module: AuthenticationModule,
      },
      {
        path: '/rbac',
        module: RbacModule,
      },
      {
        path: '/users',
        module: UsersModule,
      },
      {
        path: '/organizations',
        module: OrganizationsModule,
      },
      {
        path: '/contacts',
        module: ContactsModule,
      },
      {
        path: '/contact-lists',
        module: ContactListsModule,
      },
      {
        path: '/email-templates',
        module: EmailTemplatesModule,
      },
      {
        path: '/campaigns',
        module: CampaignsModule,
      },
      {
        path: '/tracking',
        module: TrackingModule,
      },
      {
        path: '/audit-logs',
        module: AuditLogsModule,
      },
      {
        path: '/subscriptions',
        module: SubscriptionsModule,
      },
      {
        path: '/payments',
        module: PaymentsModule,
      },
      {
        path: '/analytics',
        module: AnalyticsModule,
      },
      {
        path: '/employees',
        module: EmployeesModule,
      },
      {
        path: '/notifications',
        module: NotificationsModule,
      },
      {
        path: '/',
        module: BullModule,
      },
    ],
  },
];
