import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize, Transaction, Op } from 'sequelize';
import { ContactList } from './entities/contact-list.entity';
import { ContactListMember } from './entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ContactListsRepository extends BaseRepository<ContactList> {
  constructor(
    @InjectModel(ContactList)
    contactListModel: typeof ContactList,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectConnection()
    private readonly sequelize: Sequelize,
    userContextService: UserContextService,
  ) {
    super(contactListModel, undefined, userContextService);
  }

  async addContactsToList(
    listId: string,
    contactIds: string[],
    addedBy?: string,
    transaction?: Transaction,
  ): Promise<ContactListMember[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const effectiveUserId = addedBy || this.userContextService?.getCurrentUserId();
    const now = new Date();

    // Use bulkCreate with ignoreDuplicates for better performance
    // This leverages database constraints instead of checking in application code
    const members = contactIds.map((contactId) => ({
      contactListId: listId,
      contactId,
      addedBy: effectiveUserId,
      addedAt: now,
    }));

    // bulkCreate with ignoreDuplicates will skip duplicates at database level
    await this.contactListMemberModel.bulkCreate(members, {
      ignoreDuplicates: true,
      transaction,
    });

    // Return all members (both newly added and existing) for consistency
    return await this.contactListMemberModel.findAll({
      where: {
        contactListId: listId,
        contactId: { [Op.in]: contactIds },
      },
      transaction,
    });
  }

  async removeContactsFromList(
    listId: string,
    contactIds: string[],
    transaction?: Transaction,
  ): Promise<number> {
    return await this.contactListMemberModel.destroy({
      where: {
        contactListId: listId,
        contactId: { [Op.in]: contactIds },
      },
      transaction,
    });
  }

  async getListContacts(
    listId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: ContactListMember[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.contactListMemberModel.findAndCountAll({
      where: {
        contactListId: listId,
      },
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'email', 'firstName', 'lastName', 'company', 'jobTitle', 'phone', 'status'], // Select only needed fields
        },
      ],
      limit,
      offset,
      order: [['addedAt', 'DESC']],
      raw: false,
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async updateContactCount(listId: string, transaction?: Transaction): Promise<void> {
    const count = await this.contactListMemberModel.count({
      where: {
        contactListId: listId,
      },
      transaction,
    });

    await this.model.update(
      { contactCount: count },
      { where: { id: listId }, transaction }
    );
  }

  async updateContactCounts(listIds: string[], transaction?: Transaction): Promise<void> {
    if (listIds.length === 0) return;

    // Get counts for all lists in a single query
    const counts = await this.contactListMemberModel.findAll({
      attributes: [
        'contactListId',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
      ],
      where: {
        contactListId: { [Op.in]: listIds },
      },
      group: ['contactListId'],
      raw: true,
      transaction,
    }) as unknown as Array<{ contactListId: string; count: string | number }>;

    // Build count map for O(1) lookups
    const countMap = new Map<string, number>();
    counts.forEach((item) => {
      const count = typeof item.count === 'string' ? parseInt(item.count, 10) : item.count;
      countMap.set(item.contactListId, count);
    });

    // Group updates by count value for bulk updates
    const updatesByCount = new Map<number, string[]>();
    
    listIds.forEach((listId) => {
      const count = countMap.get(listId) || 0;
      if (!updatesByCount.has(count)) {
        updatesByCount.set(count, []);
      }
      updatesByCount.get(count)!.push(listId);
    });

    // Execute bulk updates grouped by count value (fewer queries than individual updates)
    const updatePromises = Array.from(updatesByCount.entries()).map(([count, ids]) =>
      this.model.update(
        { contactCount: count },
        { where: { id: { [Op.in]: ids } }, transaction },
      ),
    );

    await Promise.all(updatePromises);
  }

  async validateContacts(
    contactIds: string[],
    organizationId: string,
    transaction?: Transaction,
  ): Promise<{ valid: string[]; invalid: string[] }> {
    const contacts = await this.contactModel.findAll({
      where: {
        id: { [Op.in]: contactIds },
        organizationId,
      },
      attributes: ['id'],
      transaction,
      raw: true,
    });

    const validIds = new Set(contacts.map((c: any) => c.id));
    const valid = contactIds.filter((id) => validIds.has(id));
    const invalid = contactIds.filter((id) => !validIds.has(id));

    return { valid, invalid };
  }

  async getListsContainingContact(contactId: string): Promise<string[]> {
    const members = await this.contactListMemberModel.findAll({
      where: { contactId },
      attributes: ['contactListId'],
      raw: true,
    });

    return members.map((m: any) => m.contactListId);
  }
}
