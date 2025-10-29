import { Controller, Get } from '@nestjs/common';
import { OpenIdConfigurationDto } from './well-known.dto';
import { AppConfigService } from '../app-config/app-config.service';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';

@NoInterceptor()
@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get('openid-configuration')
  getOpenIdConfiguration(): OpenIdConfigurationDto {
    const issuer = this.appConfig.get('issuerUrl');

    const base = issuer?.replace(/\/$/, '') ?? '';

    const authorization_endpoint = `${base}/oauth/authorize`;
    const token_endpoint = `${base}/oauth/token`;
    const userinfo_endpoint = `${base}/oauth/userinfo`;
    const jwks_uri = `${base}/oauth/jwks.json`;

    const out: OpenIdConfigurationDto = {
      issuer: issuer,
      authorization_endpoint,
      token_endpoint,
      userinfo_endpoint,
      jwks_uri,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
    };

    return out;
  }
}
