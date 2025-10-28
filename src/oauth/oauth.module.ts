import { Module } from '@nestjs/common';
import { OauthService } from './oauth.service';
import { OauthController } from './oauth.controller';
import { PermissionService } from '../permission/permission.service';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { BasicAuthService } from './basic/basic.service';
import { BasicOAuthGuard } from './basic/basic.guard';
import { OauthClientService } from '../data-base/query/oauth-client/oauth-client.service';
import { DataBaseModule } from '../data-base/data-base.module';
import { OauthGrantedTokenService } from '../data-base/query/oauth-granted-token/oauth-granted-token.service';
import { AuthorizationCodeService } from '../data-base/query/authorization-code/authorization-code.service';

@Module({
  imports: [DataBaseModule],
  providers: [
    OauthService,
    PermissionService,
    PermissionBitcalcService,
    BasicAuthService,
    BasicOAuthGuard,
    OauthClientService,
    OauthGrantedTokenService,
    AuthorizationCodeService,
  ],
  controllers: [OauthController],
})
export class OauthModule {}
