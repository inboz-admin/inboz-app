import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class AuthenticationRepository extends BaseRepository<User> {
  constructor(
    @InjectModel(User)
    userModel: typeof User,
    userContextService: UserContextService,
  ) {
    super(userModel, undefined, userContextService);
  }
}
