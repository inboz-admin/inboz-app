import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Organization } from './entities/organization.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class OrganizationRepository extends BaseRepository<Organization> {
  constructor(
    @InjectModel(Organization)
    organizationModel: typeof Organization,
    userContextService: UserContextService,
  ) {
    super(organizationModel, undefined, userContextService);
  }
}
