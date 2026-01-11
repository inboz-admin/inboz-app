import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContactList } from './entities/contact-list.entity';
import { ContactListMember } from './entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { ContactListsController } from './contact-lists.controller';
import { ContactListsService } from './contact-lists.service';
import { ContactListsRepository } from './contact-lists.repository';

@Module({
  imports: [
    SequelizeModule.forFeature([ContactList, ContactListMember, Contact, Campaign]),
  ],
  controllers: [ContactListsController],
  providers: [ContactListsService, ContactListsRepository],
  exports: [ContactListsService, ContactListsRepository],
})
export class ContactListsModule {}
