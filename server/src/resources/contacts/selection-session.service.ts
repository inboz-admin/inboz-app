import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SelectionSessionRepository } from './selection-session.repository';
import { ContactListsRepository } from 'src/resources/contact-lists/contact-lists.repository';
import { SelectionSession } from './entities/selection-session.entity';
import { MAX_CONTACTS_PER_SESSION } from './contacts.constants';

export interface SelectionState {
  sessionId: string;
  totalSelected: number;
  baseCount: number;
  addedCount: number;
  removedCount: number;
  currentSelection: string[];
}

export interface ApplyResult {
  addedCount: number;
  removedCount: number;
  finalCount: number;
}

@Injectable()
export class SelectionSessionService {
  constructor(
    private readonly selectionSessionRepository: SelectionSessionRepository,
    private readonly contactListsRepository: ContactListsRepository,
  ) {}

  async createSession(
    listId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    // Get all contacts (use a high limit to get all members for session creation)
    // TODO: Consider pagination for very large lists (10k+ contacts)
    const result = await this.contactListsRepository.getListContacts(listId, 1, MAX_CONTACTS_PER_SESSION);
    const originalSelection = result.data
      .map((member) => {
        const contact = member.contact?.get ? member.contact.get({ plain: true }) : member.contact;
        return contact?.id || (member as any).dataValues?.contactId;
      })
      .filter(Boolean);

    const session = await this.selectionSessionRepository.createSession(
      listId,
      userId,
      originalSelection,
    );

    return { sessionId: session.id };
  }

  /**
   * Validates and retrieves a session for a user
   * @throws NotFoundException if session not found
   * @throws BadRequestException if session expired
   */
  private async validateSession(
    sessionId: string,
    userId: string,
  ): Promise<SelectionSession> {
    const session = await this.selectionSessionRepository.getSessionByIdAndUser(
      sessionId,
      userId,
    );

    if (!session) {
      throw new NotFoundException('Selection session not found');
    }

    if (session.expiresAt < new Date()) {
      throw new BadRequestException('Selection session has expired');
    }

    return session;
  }

  async getSelectionState(
    sessionId: string,
    userId: string,
  ): Promise<SelectionState> {
    const session = await this.validateSession(sessionId, userId);

    const addedCount = this.getAddedCount(session);
    const removedCount = this.getRemovedCount(session);

    return {
      sessionId: session.id,
      totalSelected: session.currentSelection.length,
      baseCount: session.originalSelection.length,
      addedCount,
      removedCount,
      currentSelection: session.currentSelection,
    };
  }

  async addContactsToSelection(
    sessionId: string,
    userId: string,
    contactIds: string[],
  ): Promise<SelectionState> {
    const session = await this.validateSession(sessionId, userId);

    const newSelection = [
      ...new Set([...session.currentSelection, ...contactIds]),
    ];

    await this.selectionSessionRepository.updateCurrentSelection(
      sessionId,
      newSelection,
    );

    return this.getSelectionState(sessionId, userId);
  }

  async removeContactsFromSelection(
    sessionId: string,
    userId: string,
    contactIds: string[],
  ): Promise<SelectionState> {
    const session = await this.validateSession(sessionId, userId);

    // OPTIMIZED: Use Set for O(1) lookup instead of O(n) includes()
    const contactIdsSet = new Set(contactIds);
    const newSelection = session.currentSelection.filter(
      (id) => !contactIdsSet.has(id),
    );

    await this.selectionSessionRepository.updateCurrentSelection(
      sessionId,
      newSelection,
    );

    return this.getSelectionState(sessionId, userId);
  }

  async applySelection(
    sessionId: string,
    userId: string,
  ): Promise<ApplyResult> {
    const session = await this.validateSession(sessionId, userId);

    const addedContacts = this.getAddedContacts(session);
    const removedContacts = this.getRemovedContacts(session);

    // Wrap all operations in a transaction for atomicity
    const sequelize = this.selectionSessionRepository['model'].sequelize;
    return await sequelize.transaction(async (tx) => {
      if (removedContacts.length > 0) {
        await this.contactListsRepository.removeContactsFromList(
          session.listId,
          removedContacts,
          tx,
        );
      }

      if (addedContacts.length > 0) {
        await this.contactListsRepository.addContactsToList(
          session.listId,
          addedContacts,
          userId,
          tx,
        );
      }

      await this.contactListsRepository.updateContactCount(session.listId, tx);

      await this.selectionSessionRepository['model'].destroy({
        where: { id: sessionId },
        transaction: tx,
      });

      return {
        addedCount: addedContacts.length,
        removedCount: removedContacts.length,
        finalCount: session.currentSelection.length,
      };
    });
  }

  async getOrCreateSession(
    listId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    const existingSession =
      await this.selectionSessionRepository.getActiveSessionByUserAndList(
        userId,
        listId,
      );

    if (existingSession) {
      return { sessionId: existingSession.id };
    }

    return this.createSession(listId, userId);
  }

  async resetSelectionToOriginal(
    sessionId: string,
    userId: string,
  ): Promise<SelectionState> {
    const session = await this.validateSession(sessionId, userId);

    await this.selectionSessionRepository.updateCurrentSelection(
      sessionId,
      session.originalSelection,
    );

    return this.getSelectionState(sessionId, userId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    return await this.selectionSessionRepository.cleanupExpiredSessions();
  }

  /**
   * Optimized: Use Set-based operations for O(n) complexity instead of O(n²)
   * Returns both added and removed contacts in a single pass
   */
  private getSelectionDiff(session: SelectionSession): {
    added: string[];
    removed: string[];
  } {
    const originalSet = new Set(session.originalSelection);
    const currentSet = new Set(session.currentSelection);

    const added = session.currentSelection.filter((id) => !originalSet.has(id));
    const removed = session.originalSelection.filter((id) => !currentSet.has(id));

    return { added, removed };
  }

  private getAddedCount(session: SelectionSession): number {
    return this.getSelectionDiff(session).added.length;
  }

  private getRemovedCount(session: SelectionSession): number {
    return this.getSelectionDiff(session).removed.length;
  }

  private getAddedContacts(session: SelectionSession): string[] {
    return this.getSelectionDiff(session).added;
  }

  private getRemovedContacts(session: SelectionSession): string[] {
    return this.getSelectionDiff(session).removed;
  }
}
