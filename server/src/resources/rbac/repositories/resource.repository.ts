import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Resource } from '../entities/resource.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ResourceRepository extends BaseRepository<Resource> {
  constructor(
    @InjectModel(Resource)
    resourceModel: typeof Resource,
    userContextService: UserContextService,
  ) {
    super(resourceModel, undefined, userContextService);
  }
}
