import { Module } from '@nestjs/common';
import { OauthService } from './oauth.service';
import { OauthController } from './oauth.controller';
import { PermissionService } from '../permission/permission.service';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';

@Module({
  providers: [OauthService, PermissionService, PermissionBitcalcService],
  controllers: [OauthController],
})
export class OauthModule {}
