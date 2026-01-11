import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SelectionSession } from './entities/selection-session.entity';
import { BaseRepository } from 'src/common/repository/base.repository';
import { UserContextService } from 'src/common/services/user-context.service';
import { Op } from 'sequelize';
import { SELECTION_SESSION_EXPIRY_MINUTES } from './contacts.constants';

@Injectable()
export class SelectionSessionRepository extends BaseRepository<SelectionSession> {
  constructor(
    @InjectModel(SelectionSession)
    selectionSessionModel: typeof SelectionSession,
    userContextService: UserContextService,
  ) {
    super(selectionSessionModel, undefined, userContextService);
  }

  async createSession(
    listId: string,
    userId: string,
    originalSelection: string[],
  ): Promise<SelectionSession> {
    const expiresAt = new Date(Date.now() + SELECTION_SESSION_EXPIRY_MINUTES * 60 * 1000);

    return await this.create(
      {
        listId,
        userId,
        originalSelection,
        currentSelection: [...originalSelection],
        expiresAt,
      },
      undefined,
    );
  }

  async getSessionByIdAndUser(
    sessionId: string,
    userId: string,
  ): Promise<SelectionSession | null> {
    return await this.model.findOne({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async updateCurrentSelection(
    sessionId: string,
    currentSelection: string[],
  ): Promise<void> {
    await this.model.update(
      { currentSelection },
      { where: { id: sessionId } },
    );
  }

  async getActiveSessionByUserAndList(
    userId: string,
    listId: string,
  ): Promise<SelectionSession | null> {
    return await this.model.findOne({
      where: {
        userId,
        listId,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.model.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
    return result;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.model.destroy({ where: { id: sessionId } });
  }
}
