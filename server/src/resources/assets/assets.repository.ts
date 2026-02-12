import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Asset } from './entities/asset.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class AssetRepository extends BaseRepository<Asset> {
  constructor(
    @InjectModel(Asset)
    assetModel: typeof Asset,
    userContextService: UserContextService,
  ) {
    super(assetModel, undefined, userContextService);
  }
}
