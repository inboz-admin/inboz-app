import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationRepository } from './organizations.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { Organization } from './entities/organization.entity';
import { MulterModule } from 'src/configuration/multer/multer.module';
import { OrganizationValidator } from './services/organization-validation.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Organization]),
    MulterModule,
    CommonModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationRepository,
    OrganizationValidator,
  ],
  exports: [OrganizationsService, OrganizationValidator],
})
export class OrganizationsModule {}
