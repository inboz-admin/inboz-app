import { Injectable, Logger } from '@nestjs/common';
import { AssetRepository } from './assets.repository';
import { Asset } from './entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import { BaseService } from 'src/common/services/base.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { WhereOptions } from 'sequelize';

@Injectable()
export class AssetsService extends BaseService<Asset> {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly userContextService: UserContextService,
    private readonly transactionManager: TransactionManager,
  ) {
    super(assetRepository);
  }

  async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
    const user = this.userContextService.getCurrentUser();
    const organizationId = user?.organizationId;
    const userId = user?.sub;

    if (!organizationId) {
      throw new Error('User organization not found');
    }

    return this.transactionManager.execute(async (transaction) => {
      const assetData: Partial<Asset> = {
        ...createAssetDto,
        organizationId,
        type: createAssetDto.type || 'image',
      };

      const asset = await this.assetRepository.create(
        assetData,
        transaction,
        userId,
      );

      this.logger.log(`Created asset: ${asset.id} (${asset.originalname})`);
      return asset as Asset;
    });
  }

  async findAll(query?: AssetQueryDto) {
    const user = this.userContextService.getCurrentUser();
    const where: WhereOptions<Asset> = {};

    if (query?.type) {
      (where as any).type = query.type;
    }

    // Regular users (non-employee) see only their own assets; employees see all org assets
    if (user && user.type !== 'employee' && user.sub) {
      (where as any).createdBy = user.sub;
    }

    return this.assetRepository.findAll({
      where,
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 50,
        searchTerm: query?.searchTerm || '',
        searchFields: ['originalname', 'filename'],
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
      organizationId: query?.organizationId,
    });
  }

  async findById(id: string): Promise<Asset | null> {
    const result = await this.assetRepository.findById(id);
    return result as Asset | null;
  }

  async remove(id: string): Promise<Asset> {
    const asset = await this.findById(id);
    if (!asset) {
      throw new Error('Asset not found');
    }
    await this.assetRepository.delete({ id } as any);
    return asset;
  }
}
