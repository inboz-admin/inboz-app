import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { CreateContactListDto } from './dto/create-contact-list.dto';
import { UpdateContactListDto } from './dto/update-contact-list.dto';
import { ContactListQueryDto } from './dto/contact-list-query.dto';
import { AddContactsToListDto } from './dto/add-contacts-to-list.dto';
import { ContactListsRepository } from './contact-lists.repository';
import { ContactList } from './entities/contact-list.entity';
import { ContactListMember } from './entities/contact-list-member.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { BaseService } from 'src/common/services/base.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { ContactListType } from './enums/contact-list-type.enum';
import { UserRole } from 'src/common/enums/roles.enum';
import { WhereOptions } from 'sequelize';

@Injectable()
export class ContactListsService extends BaseService<ContactList> {
  constructor(
    private readonly contactListsRepository: ContactListsRepository,
    private readonly transactionManager: TransactionManager,
    private readonly userContextService: UserContextService,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
  ) {
    super(contactListsRepository);
  }

  async createContactList(
    createContactListDto: CreateContactListDto,
  ): Promise<ContactList> {
    return await this.transactionManager.execute(async (transaction: Transaction) => {
      const existingList = await this.contactListsRepository.findOne({
        where: {
          name: createContactListDto.name,
          organizationId: createContactListDto.organizationId,
        },
        transaction,
      });

      if (existingList) {
        throw new ConflictException(
          `Contact list with name "${createContactListDto.name}" already exists in this organization`,
        );
      }

      const listData = {
        ...createContactListDto,
        contactCount: 0,
        type: createContactListDto.type || ContactListType.PRIVATE, // Default to PRIVATE
      };

      const currentUserId = this.userContextService.getCurrentUserId();
      return await this.contactListsRepository.create(
        listData,
        transaction,
        currentUserId,
      );
    });
  }

  async findAll(query?: ContactListQueryDto) {
    const currentUser = this.userContextService.getCurrentUser();
    const currentUserId = currentUser?.sub;
    const currentUserRole = currentUser?.role;
    const isEmployee = currentUser?.type === 'employee';
    const queryOrganizationId = query?.organizationId;

    // Build where conditions based on user type
    let whereConditions: any = {};
    
    if (!isEmployee) {
      // Regular users: use buildAccessFilter with organizationId from JWT
      // buildAccessFilter handles showing user's own lists + public lists
      const organizationId = currentUser?.organizationId;
      if (organizationId) {
        whereConditions = this.buildAccessFilter(
          organizationId,
          currentUserId,
          currentUserRole,
          query?.type,
        );
      } else {
        // No organizationId for regular user - should not happen, but handle gracefully
        throw new BadRequestException('User must be associated with an organization');
      }
    } else {
      // Employees: BaseRepository will handle tenant filtering via organizationId in RepositoryOptions
      // We can add additional filters here (type, etc.)
      if (query?.type) {
        whereConditions.type = query.type;
      }
    }

    return this.contactListsRepository.findAll({
      where: whereConditions,
      organizationId: isEmployee ? queryOrganizationId : undefined, // Only pass for employees
      pagination: {
        page: query?.page,
        limit: query?.limit,
        searchTerm: query?.search || '',
        searchFields: ['name', 'description'],
        sortBy: query?.sortBy || 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  async findContactListById(id: string, transaction?: Transaction): Promise<ContactList> {
    const list = await this.contactListsRepository.findById(id, transaction);
    if (!list) {
      throw new NotFoundException(`Contact list with ID ${id} not found`);
    }
    return list as ContactList;
  }

  async updateContactList(
    id: string,
    updateContactListDto: UpdateContactListDto,
  ): Promise<ContactList> {
    return await this.transactionManager.executeSerializable(async (transaction: Transaction) => {
      const list = await this.findContactListById(id, transaction);

      // Validate name uniqueness within transaction
      if (updateContactListDto.name && updateContactListDto.name !== list.name) {
        await this.validateNameUniqueness(
          updateContactListDto.name,
          list.organizationId,
          id,
          transaction,
        );
      }

      const affectedCount = await this.contactListsRepository.update(
        { id },
        updateContactListDto,
        transaction,
      );

      if (affectedCount === 0) {
        throw new NotFoundException(`Contact list with ID ${id} not found`);
      }

      return (await this.contactListsRepository.findById(id, transaction)) as ContactList;
    });
  }

  /**
   * Validate name uniqueness within organization
   * @private
   */
  private async validateNameUniqueness(
    name: string,
    organizationId: string,
    excludeId?: string,
    transaction?: Transaction,
  ): Promise<void> {
    const where: any = {
      name,
      organizationId,
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await this.contactListsRepository.findOne({
      where,
      transaction,
    });

    if (existing) {
      throw new ConflictException(
        `Contact list with name "${name}" already exists in this organization`,
      );
    }
  }

  async removeContactList(id: string): Promise<ContactList> {
    return await this.transactionManager.execute(async (transaction: Transaction) => {
      await this.validateListCanBeDeleted(id, transaction);
      const list = await this.findContactListById(id, transaction);
      
      // Delete all contact list members first
      await this.contactListMemberModel.destroy({
        where: { contactListId: id },
        transaction,
      });
      
      // Hard delete - permanently remove the contact list
      await this.hardDelete({ id }, transaction);
      
      return list;
    });
  }

  async permanentlyDeleteContactList(id: string): Promise<ContactList> {
    // Alias for removeContactList - both do hard delete now
    return this.removeContactList(id);
  }

  async validateListCanBeDeleted(
    listId: string,
    transaction?: Transaction,
  ): Promise<void> {
    // Check for campaigns using this contact list (excluding DRAFT campaigns)
    // DRAFT campaigns can be easily modified, so we allow deletion if only used in drafts
    const campaigns = await this.campaignModel.findAll({
      where: {
        contactListId: listId,
        status: { [Op.ne]: 'DRAFT' },
      },
      attributes: ['id', 'name', 'status'],
      limit: 10,
      lock: transaction ? Transaction.LOCK.UPDATE : undefined,
      transaction,
    });

    if (campaigns.length > 0) {
      const campaignNames = campaigns
        .map((campaign) => {
          const name = campaign.name || campaign.get?.('name');
          const status = campaign.status || campaign.get?.('status');
          return name ? `"${name}" (${status})` : null;
        })
        .filter(Boolean)
        .join(', ');

      const totalCount = await this.campaignModel.count({
        where: {
          contactListId: listId,
          status: { [Op.ne]: 'DRAFT' },
        },
        transaction,
      });

      throw new BadRequestException(
        `Cannot delete contact list. It is being used by ${totalCount} non-draft campaign(s): ${campaignNames}. Please remove it from all campaigns first.`,
      );
    }
  }

  async getListsContainingContact(contactId: string): Promise<string[]> {
    return await this.contactListsRepository.getListsContainingContact(contactId);
  }

  async restoreContactList(id: string) {
    await this.restore({ id }, undefined);
    return this.findContactListById(id);
  }

  async addContactsToList(
    listId: string,
    addContactsDto: AddContactsToListDto,
    addedBy?: string,
  ) {
    return await this.transactionManager.execute(async (transaction: Transaction) => {
      const list = await this.findContactListById(listId, transaction);

      const validation = await this.contactListsRepository.validateContacts(
        addContactsDto.contactIds,
        list.organizationId,
        transaction,
      );

      if (validation.invalid.length > 0) {
        throw new BadRequestException(
          `The following contact IDs are invalid or do not belong to this organization: ${validation.invalid.join(', ')}`,
        );
      }

      const effectiveAddedBy = addedBy || this.userContextService.getCurrentUserId();
      const members = await this.contactListsRepository.addContactsToList(
        listId,
        validation.valid,
        effectiveAddedBy,
        transaction,
      );

      await this.contactListsRepository.updateContactCount(listId, transaction);

      const totalRequested = addContactsDto.contactIds.length;
      const addedCount = members.length;
      const duplicateCount = totalRequested - addedCount;

      let message = `Added ${addedCount} contacts to list "${list.name}"`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} were already in the list)`;
      }

      return {
        success: true,
        message,
        addedCount,
        duplicateCount,
        totalRequested,
      };
    });
  }

  async removeContactsFromList(
    listId: string,
    removeContactsDto: AddContactsToListDto,
  ) {
    return await this.transactionManager.execute(async (transaction: Transaction) => {
      const list = await this.findContactListById(listId, transaction);

      const removedCount =
        await this.contactListsRepository.removeContactsFromList(
          listId,
          removeContactsDto.contactIds,
          transaction,
        );

      await this.contactListsRepository.updateContactCount(listId, transaction);

      return {
        success: true,
        message: `Removed ${removedCount} contacts from list "${list.name}"`,
        removedCount,
      };
    });
  }

  async getListContacts(
    listId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.findContactListById(listId);

    const result = await this.contactListsRepository.getListContacts(
      listId,
      page,
      limit,
    );

    // Simplified mapping - Sequelize already handles plain objects
    const contacts = result.data
      .map((member) => member.contact?.get({ plain: true }))
      .filter(Boolean);

    return {
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: contacts,
    };
  }

  async updateContactCount(listId: string, transaction?: Transaction): Promise<void> {
    await this.findContactListById(listId);
    await this.contactListsRepository.updateContactCount(listId, transaction);
  }

  async updateContactCounts(listIds: string[], transaction?: any): Promise<void> {
    if (listIds.length === 0) return;

    await this.contactListsRepository.updateContactCounts(listIds, transaction);
  }

  async updateCountsForDeletedContact(contactId: string): Promise<void> {
    const listIds = await this.contactListsRepository.getListsContainingContact(
      contactId,
    );

    if (listIds.length > 0) {
      await this.updateContactCounts(listIds);
    }
  }

  private buildAccessFilter(
    organizationId: string,
    userId?: string,
    userRole?: string,
    type?: ContactListType,
  ): WhereOptions<ContactList> {
    const base: any = { organizationId };

    // Admin users see all records in the organization
    const isAdmin = userRole === UserRole.ADMIN;

    if (isAdmin) {
      // Admin: show all lists in organization (no additional filter)
      // Only apply type filter if explicitly requested
      if (type !== undefined) {
        base.type = type;
      }
      return base;
    }

    // Normal users: show their own records + public records
    if (type === undefined) {
      // Default: show user's lists and public lists
      if (userId) {
        base[Op.or] = [
          { createdBy: userId },
          { type: ContactListType.PUBLIC },
        ];
      } else {
        base.type = ContactListType.PUBLIC;
      }
    } else if (type === ContactListType.PUBLIC) {
      // Show only public lists
      base.type = ContactListType.PUBLIC;
    } else {
      // Show only private lists that belong to the current user
      base.type = ContactListType.PRIVATE;
      if (userId) {
        base.createdBy = userId;
      }
    }

    return base;
  }
}
