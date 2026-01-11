import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Action } from '../entities/action.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ActionRepository extends BaseRepository<Action> {
  constructor(
    @InjectModel(Action)
    actionModel: typeof Action,
    userContextService: UserContextService,
  ) {
    super(actionModel, undefined, userContextService);
  }
}
