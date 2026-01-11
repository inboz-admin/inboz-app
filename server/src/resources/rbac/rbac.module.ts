import { Module } from '@nestjs/common';
import { ActionService } from './services/action.service';
import { ResourceService } from './services/resource.service';
import { RoleService } from './services/role.service';
import { ActionController } from './controllers/action.controller';
import { ResourceController } from './controllers/resource.controller';
import { RoleController } from './controllers/role.controller';
import { ActionRepository } from './repositories/action.repository';
import { ResourceRepository } from './repositories/resource.repository';
import { RoleRepository } from './repositories/role.repository';
import { ConfigService } from '@nestjs/config';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Module({
  imports: [],
  controllers: [ActionController, ResourceController, RoleController],
  providers: [
    ActionService,
    ResourceService,
    RoleService,
    ActionRepository,
    ResourceRepository,
    RoleRepository,
    ConfigService,
    PermissionsGuard,
  ],
  exports: [ActionService, ResourceService, RoleService, PermissionsGuard],
})
export class RbacModule {}
