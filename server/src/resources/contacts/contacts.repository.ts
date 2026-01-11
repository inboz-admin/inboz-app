import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Contact } from './entities/contact.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ContactRepository extends BaseRepository<Contact> {
  constructor(
    @InjectModel(Contact)
    contactModel: typeof Contact,
    userContextService: UserContextService,
  ) {
    super(contactModel, undefined, userContextService);
  }

  async bulkCreateContacts(
    contactsData: Partial<Contact>[],
  ): Promise<{ created: Contact[]; attempted: number }> {
    const created = await this.model.bulkCreate(contactsData, {
      validate: true,
      ignoreDuplicates: true,
    });

    return {
      created,
      attempted: contactsData.length,
    };
  }
}
