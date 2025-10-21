import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { DomainModule } from '../lib/domain';
import { RoleService } from '../data-base/query/role/role.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';

@Module({
  imports: [
    DomainModule.forRoot({
      allowedDomains: [process.env.ADMIN_DOMAIN!],
    }),
  ],
  controllers: [RoleController],
  providers: [RoleService, PermissionBitcalcService, JwtTokenService],
  exports: [RoleService],
})
export class RoleModule {}
