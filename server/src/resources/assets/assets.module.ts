import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Asset } from './entities/asset.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetRepository } from './assets.repository';

@Module({
  imports: [SequelizeModule.forFeature([Asset])],
  controllers: [AssetsController],
  providers: [AssetsService, AssetRepository],
  exports: [AssetsService, AssetRepository],
})
export class AssetsModule {}
