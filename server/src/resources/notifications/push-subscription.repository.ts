import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PushSubscription } from './entities/push-subscription.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class PushSubscriptionRepository extends BaseRepository<PushSubscription> {
  constructor(
    @InjectModel(PushSubscription)
    pushSubscriptionModel: typeof PushSubscription,
    userContextService: UserContextService,
  ) {
    super(pushSubscriptionModel, undefined, userContextService);
  }

  /**
   * Find all subscriptions for a user
   */
  async findByUserId(userId: string): Promise<PushSubscription[]> {
    return this.model.findAll({
      where: {
        userId,
        deletedAt: null,
      },
    });
  }

  /**
   * Find subscription by endpoint
   */
  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return this.model.findOne({
      where: {
        endpoint,
        deletedAt: null,
      },
    });
  }

  /**
   * Delete subscription by endpoint
   */
  async deleteByEndpoint(endpoint: string, userId: string): Promise<number> {
    const currentUserId = this.userContextService.getCurrentUserId();
    return this.model.update(
      {
        deletedAt: new Date(),
        deletedBy: currentUserId,
      },
      {
        where: {
          endpoint,
          userId,
          deletedAt: null,
        },
      },
    );
  }
}

