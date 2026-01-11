import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { EmailMessage, EmailMessageStatus } from '../entities/email-message.entity';
import { Op, Transaction } from 'sequelize';

/**
 * Shared service for campaign contact operations
 * Centralizes contact counting and filtering logic (DRY principle)
 */
@Injectable()
export class CampaignContactService {
  private readonly logger = new Logger(CampaignContactService.name);

  constructor(
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
  ) {}

  /**
   * Counts only subscribed contacts in a contact list
   * Excludes bounced and unsubscribed contacts
   * 
   * Time Complexity: O(C) where C = number of contacts in list
   * Space Complexity: O(1)
   * 
   * @param contactListId - ID of the contact list
   * @param transaction - Optional database transaction
   * @returns Number of subscribed, non-bounced contacts
   */
  async countSubscribedContacts(
    contactListId: string,
    transaction?: Transaction,
  ): Promise<number> {
    return this.contactListMemberModel.count({
      where: { contactListId },
      include: [
        {
          model: this.contactModel,
          as: 'contact',
          where: {
            subscribed: true,
            status: { [Op.not]: 'BOUNCED' }, // Exclude bounced contacts from quota calculation
          },
          required: true,
        },
      ],
      transaction,
    });
  }

  /**
   * Get all subscribed contacts for a contact list
   * Used for email scheduling and processing
   * 
   * Time Complexity: O(C) where C = number of contacts
   * Space Complexity: O(C) for returned array
   * 
   * @param contactListId - ID of the contact list
   * @param transaction - Optional database transaction
   * @returns Array of subscribed, non-bounced contacts
   */
  async getSubscribedContacts(
    contactListId: string,
    transaction?: Transaction,
  ): Promise<Contact[]> {
    const contactMembers = await this.contactListMemberModel.findAll({
      where: { contactListId },
      include: [
        {
          model: this.contactModel,
          as: 'contact',
          required: true,
        },
      ],
      order: [['contactId', 'ASC']], // Consistent ordering for quota distribution
      transaction,
    });

    return contactMembers
      .map((member) => member.contact)
      .filter(
        (contact) =>
          contact != null &&
          contact.subscribed !== false &&
          contact.status !== 'BOUNCED', // Exclude globally bounced contacts
      ) as Contact[];
  }

  /**
   * Counts subscribed contacts excluding those who unsubscribed or bounced in ANY step of this campaign
   * Used when adding new steps to active campaigns
   * 
   * Time Complexity: O(C + U + B) where C = contacts, U = unsubscribed emails, B = bounced emails
   * Space Complexity: O(U + B) for the Sets
   * 
   * @param contactListId - ID of the contact list
   * @param campaignId - ID of the campaign to check for unsubscribes and bounces
   * @param excludeStepIds - Optional step IDs to exclude from check (e.g., current step being added)
   * @param transaction - Optional database transaction
   * @returns Number of subscribed contacts excluding campaign-specific unsubscribes and bounces
   */
  async countSubscribedContactsExcludingCampaignUnsubscribes(
    contactListId: string,
    campaignId: string,
    excludeStepIds?: string[],
    transaction?: Transaction,
  ): Promise<number> {
    // Get all subscribed contacts first (already excludes globally bounced/unsubscribed)
    const allContacts = await this.getSubscribedContacts(
      contactListId,
      transaction,
    );

    if (allContacts.length === 0) {
      return 0;
    }

    // Build where clause for ALL steps in this campaign (not just previous)
    const campaignStepsWhere: any = {
      campaignId,
    };

    // Exclude specific step IDs if provided (e.g., current step being processed)
    if (excludeStepIds && excludeStepIds.length > 0) {
      campaignStepsWhere.campaignStepId = { [Op.notIn]: excludeStepIds };
    }

    // Get contacts who unsubscribed from ANY step of this campaign
    const unsubscribedWhere = {
      ...campaignStepsWhere,
      unsubscribedAt: { [Op.ne]: null },
    };

    const unsubscribedEmails = await this.emailMessageModel.findAll({
      where: unsubscribedWhere,
      attributes: ['contactId'],
      group: ['contactId'],
      raw: true,
      transaction,
    });

    // Get contacts who bounced in ANY step of this campaign
    const bouncedWhere = {
      ...campaignStepsWhere,
      status: EmailMessageStatus.BOUNCED,
    };

    const bouncedEmails = await this.emailMessageModel.findAll({
      where: bouncedWhere,
      attributes: ['contactId'],
      group: ['contactId'],
      raw: true,
      transaction,
    });

    const unsubscribedContactIds = new Set(
      unsubscribedEmails.map((email: any) => email.contactId),
    );
    const bouncedContactIds = new Set(
      bouncedEmails.map((email: any) => email.contactId),
    );

    // Combine both sets for efficient filtering
    const excludedContactIds = new Set([
      ...unsubscribedContactIds,
      ...bouncedContactIds,
    ]);

    // Filter out unsubscribed and bounced contacts
    const validContacts = allContacts.filter(
      (contact) => !excludedContactIds.has(contact.id),
    );

    if (excludedContactIds.size > 0) {
      this.logger.log(
        `Excluding ${excludedContactIds.size} contact(s) from campaign ${campaignId} count: ` +
          `${unsubscribedContactIds.size} unsubscribed, ${bouncedContactIds.size} bounced ` +
          `(checked all steps${excludeStepIds && excludeStepIds.length > 0 ? `, excluding steps: ${excludeStepIds.join(', ')}` : ''})`,
      );
    }

    return validContacts.length;
  }

  /**
   * Creates a map of contactId to index for O(1) lookups
   * Used in quota distribution and email scheduling
   * 
   * Time Complexity: O(C) where C = number of contacts
   * Space Complexity: O(C) for the map
   * 
   * @param contacts - Array of contacts
   * @returns Map<contactId, index>
   */
  createContactIndexMap(contacts: Contact[]): Map<string, number> {
    const indexMap = new Map<string, number>();
    contacts.forEach((contact, index) => {
      indexMap.set(contact.id, index);
    });
    return indexMap;
  }
}



