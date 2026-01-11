import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan> {
  constructor(
    @InjectModel(SubscriptionPlan)
    subscriptionPlanModel: typeof SubscriptionPlan,
    userContextService: UserContextService,
  ) {
    super(subscriptionPlanModel, undefined, userContextService);
  }
}



























