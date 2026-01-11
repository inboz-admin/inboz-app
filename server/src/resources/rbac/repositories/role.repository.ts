import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from '../entities/role.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(
    @InjectModel(Role)
    roleModel: typeof Role,
    userContextService: UserContextService,
  ) {
    super(roleModel, undefined, userContextService);
  }
}
