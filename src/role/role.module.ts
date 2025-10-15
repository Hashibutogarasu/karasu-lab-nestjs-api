import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { DomainModule } from '../lib/domain';

@Module({
  imports: [
    DomainModule.forRoot({
      allowedDomains: [process.env.ADMIN_DOMAIN!],
    }),
  ],
  controllers: [RoleController],
  providers: [RoleService, PermissionBitcalcService],
  exports: [RoleService],
})
export class RoleModule {}
