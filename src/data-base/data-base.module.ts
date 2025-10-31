import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UtilityService } from './utility/utility.service';
import { PasswordService } from './utility/password/password.service';
import { JwtstateService } from './query/jwtstate/jwtstate.service';
import { ExternalProviderAccessTokenService } from './query/external-provider-access-token/external-provider-access-token.service';
import { RoleService } from './query/role/role.service';
import { MfaService } from './query/mfa/mfa.service';
import { DataBaseService } from './data-base.service';
import { AuthStateService } from './query/auth-state/auth-state.service';
import { UserService } from './query/user/user.service';
import { ExtraProfileService } from './query/extra-profile/extra-profile.service';
import { TotpService } from '../totp/totp.service';
import { PermissionBitcalcModule } from '../permission-bitcalc/permission-bitcalc.module';
import { DataBaseMiddleware } from './data-base.middleware';
import { DateTimeService } from '../date-time/date-time.service';
import { OauthClientService } from './query/oauth-client/oauth-client.service';
import { OauthGrantedTokenService } from './query/oauth-granted-token/oauth-granted-token.service';
import { ExternalProviderLinkVerifyService } from './query/external-provider-link-verify/external-provider-link-verify.service';
import { SessionService } from './query/session/session.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => PermissionBitcalcModule),
  ],
  providers: [
    UtilityService,
    PasswordService,
    JwtstateService,
    ExternalProviderAccessTokenService,
    RoleService,
    MfaService,
    DataBaseService,
    AuthStateService,
    UserService,
    ExtraProfileService,
    TotpService,
    DateTimeService,
    OauthClientService,
    OauthGrantedTokenService,
    ExternalProviderLinkVerifyService,
    SessionService,
    JwtTokenService,
  ],
  exports: [
    UtilityService,
    PasswordService,
    JwtstateService,
    ExternalProviderAccessTokenService,
    RoleService,
    MfaService,
    DataBaseService,
    AuthStateService,
    UserService,
    ExtraProfileService,
    ExternalProviderLinkVerifyService,
    SessionService,
    JwtTokenService,
  ],
})
export class DataBaseModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DataBaseMiddleware).forRoutes('*');
  }
}
