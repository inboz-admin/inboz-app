import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserRepository } from './users.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { GmailOAuthToken } from './entities/gmail-oauth-token.entity';
import { MulterModule } from 'src/configuration/multer/multer.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User, GmailOAuthToken]),
    MulterModule,
    OrganizationsModule,
    SubscriptionsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
