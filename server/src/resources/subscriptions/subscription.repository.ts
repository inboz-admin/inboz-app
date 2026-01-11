import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Subscription } from './entities/subscription.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor(
    @InjectModel(Subscription)
    subscriptionModel: typeof Subscription,
    userContextService: UserContextService,
  ) {
    super(subscriptionModel, undefined, userContextService);
  }
}



























