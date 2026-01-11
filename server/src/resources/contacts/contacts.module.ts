import { Module, Global, forwardRef } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { ContactRepository } from './contacts.repository';
import { SelectionSessionService } from './selection-session.service';
import { SelectionSessionRepository } from './selection-session.repository';
import { SimpleBulkUploadService } from './simple-bulk-upload.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Contact } from './entities/contact.entity';
import { SelectionSession } from './entities/selection-session.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { ExcelModule } from 'src/configuration/excel/excel.module';
import { MulterModule } from 'src/configuration/multer/multer.module';
import { ContactListsModule } from 'src/resources/contact-lists/contact-lists.module';
import { WsModule } from 'src/resources/ws/ws.module';
import { AuditLogsModule } from 'src/resources/audit-logs/audit-logs.module';

@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([Contact, SelectionSession, ContactListMember]),
    ExcelModule,
    MulterModule,
    ContactListsModule,
    WsModule,
    AuditLogsModule,
  ],
  controllers: [ContactsController],
  providers: [
    ContactsService,
    ContactRepository,
    SelectionSessionService,
    SelectionSessionRepository,
    SimpleBulkUploadService,
  ],
  exports: [
    ContactsService,
    SelectionSessionService,
    SimpleBulkUploadService,
    ContactRepository,
  ],
})
export class ContactsModule {}
