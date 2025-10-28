import { Injectable } from '@nestjs/common';
import {
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
} from './oauth.dto';
import { AppErrorCodes } from '../types/error-codes';
import { PublicUser } from '../auth/decorators/auth-user.decorator';
import { PermissionBitcalcService } from '../permission-bitcalc/permission-bitcalc.service';
import { AppConfigService } from '../app-config/app-config.service';
import { OauthClientService } from '../data-base/query/oauth-client/oauth-client.service';
import { PermissionService } from '../permission/permission.service';
import { OauthGrantedTokenService } from '../data-base/query/oauth-granted-token/oauth-granted-token.service';
import { AuthorizationCodeService } from '../data-base/query/authorization-code/authorization-code.service';
import { UserService } from '../data-base/query/user/user.service';
import { JwtTokenService } from '../auth/jwt-token/jwt-token.service';
import { OAuthClient } from '@prisma/client';

@Injectable()
export class OauthService {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly permissionBitCalcService: PermissionBitcalcService,
    private readonly oauthClientService: OauthClientService,
    private readonly oauthGrantedTokenService: OauthGrantedTokenService,
    private readonly authorizationCodeService: AuthorizationCodeService,
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly appConfig: AppConfigService,
  ) { }

  async authorize(params: OAuthAuthorizeQuery, user: PublicUser) {
    if (params.response_type !== 'code') {
      throw AppErrorCodes.UNSUPPORTED_RESPONSE_TYPE;
    }

    const client = await this.oauthClientService.findById(params.client_id);
    if (!client) throw AppErrorCodes.INVALID_CLIENT;

    const allowed = client.redirectUris || [];
    if (!allowed.includes(params.redirect_uri)) {
      throw AppErrorCodes.INVALID_REDIRECT_URI;
    }

    if (!params.code_challenge || !params.code_challenge_method) {
      throw AppErrorCodes.INVALID_PARAMETERS;
    }

    const code = await this.authorizationCodeService.createAuthorizationCode({
      clientId: client.id,
      userId: user.id,
      redirectUri: params.redirect_uri,
      scope: params.scope,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: params.code_challenge_method,
    });

    try {
      const url = new URL(params.redirect_uri);
      url.searchParams.set('code', code);
      if (params.state) url.searchParams.set('state', params.state);
      return url.toString();
    } catch (e) {
      throw AppErrorCodes.INVALID_REDIRECT_URI;
    }
  }

  async token(
    body: OAuthTokenBodyDto,
    client: OAuthClient,
  ): Promise<OAuthTokenResponseDto> {
    if (body.client_id && body.client_id !== client.id) {
      throw AppErrorCodes.INVALID_CLIENT;
    }

    if (!body.code) throw AppErrorCodes.INVALID_REQUEST;

    const authCode =
      await this.authorizationCodeService.consumeAuthorizationCode(body.code);
    if (!authCode) throw AppErrorCodes.INVALID_GRANT;

    if (authCode.clientId !== client.id)
      throw AppErrorCodes.UNAUTHORIZED_CLIENT;

    if (body.redirect_uri && body.redirect_uri !== authCode.redirectUri) {
      throw AppErrorCodes.INVALID_REDIRECT_URI;
    }

    const verifier = body.code_verifier;
    if (!verifier) {
      throw AppErrorCodes.INVALID_REQUEST;
    }

    const validPKCE = this.authorizationCodeService.verifyCodeChallenge(
      verifier,
      authCode.codeChallenge || '',
      authCode.codeChallengeMethod || 'S256',
    );
    if (!validPKCE) throw AppErrorCodes.INVALID_GRANT;

    const user = await this.userService.findById(authCode.userId);
    if (!user) throw AppErrorCodes.USER_NOT_FOUND;

    const scopeStr = authCode.scope ?? '';
    const requestedScopes =
      scopeStr === '' ? [] : scopeStr.split(' ').filter(Boolean);

    const roles = user.roles ?? [];
    const userMask = roles.reduce((acc, r) => acc | (r.bitmask ?? 0), 0);

    const userPerms = this.permissionBitCalcService.decode(userMask);
    const clientPerms =
      this.permissionService.scopesToPermissions(requestedScopes);

    const clientOwnerPerms = this.permissionBitCalcService.decode(
      Number(client.permissionBitMask ?? 0),
    );

    const finalPerms = this.permissionService.filterRequestedPermissions(
      userPerms,
      clientPerms,
      clientOwnerPerms,
    );

    const permissionBitMask = this.permissionBitCalcService.encode(finalPerms);

    const accessExpiryMs = 1000 * 60 * 60; // 1h
    const expiryAt = new Date(Date.now() + accessExpiryMs);

    const granted = await this.oauthGrantedTokenService.create({
      userId: user.id,
      permissionBitMask,
      expiryAt,
      clientId: client.id,
    });

    const accessToken =
      await this.oauthGrantedTokenService.encodeGrantedJWT(granted);

    const now = Math.floor(Date.now() / 1000);
    const refreshExp = now + 24 * 60 * 60 * 30; // 30 days
    const iss = this.appConfig.get('issuerUrl');

    const refreshPayload = {
      id: granted.jti,
      iss: iss,
      jti: granted.jti,
      sub: user.id,
      provider: client.id,
      aud: client.id,
      iat: now,
      exp: refreshExp,
    } as const;

    const refreshToken = this.jwtTokenService.encodePayload(refreshPayload);

    const expires_in = Math.floor((expiryAt.getTime() - Date.now()) / 1000);

    const scopesOut = this.permissionService.permissionsToScopes(finalPerms);

    const oidcScopes = requestedScopes.filter((s) =>
      ['openid', 'profile', 'email', 'address', 'phone'].includes(s),
    );

    const finalScopes = Array.from(new Set([...scopesOut, ...oidcScopes]));

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in,
      refresh_token: refreshToken,
      scope: finalScopes.join(' '),
    } as OAuthTokenResponseDto;
  }

  async refreshToken(
    body: OAuthTokenBodyDto,
    client: OAuthClient,
  ): Promise<OAuthTokenResponseDto> {
    const refreshToken = body.refresh_token;
    if (!refreshToken) throw AppErrorCodes.INVALID_REQUEST;

    const verify = await this.jwtTokenService.verifyJWTToken(refreshToken);
    if (!verify.success || !verify.payload) throw AppErrorCodes.INVALID_GRANT;

    const payload = verify.payload;

    if (payload.provider !== client.id) throw AppErrorCodes.UNAUTHORIZED_CLIENT;

    const jti = payload.jti;
    if (!jti) throw AppErrorCodes.INVALID_GRANT;

    const existing = await this.oauthGrantedTokenService.findByJti(jti);
    if (!existing) throw AppErrorCodes.INVALID_GRANT;

    if (existing.clientId !== client.id)
      throw AppErrorCodes.UNAUTHORIZED_CLIENT;

    const user = await this.userService.findById(existing.userId);
    if (!user) throw AppErrorCodes.USER_NOT_FOUND;

    await this.oauthGrantedTokenService.deleteByJti(jti);

    const accessExpiryMs = 1000 * 60 * 60; // 1h
    const expiryAt = new Date(Date.now() + accessExpiryMs);

    const granted = await this.oauthGrantedTokenService.create({
      userId: existing.userId,
      permissionBitMask: existing.permissionBitMask,
      expiryAt,
      clientId: client.id,
    });

    const accessToken =
      await this.oauthGrantedTokenService.encodeGrantedJWT(granted);

    const now = Math.floor(Date.now() / 1000);
    const refreshExp = now + 24 * 60 * 60 * 30; // 30 days
    const iss = this.appConfig.get('issuerUrl');

    const refreshPayload = {
      id: granted.jti,
      jti: granted.jti,
      iss: iss,
      sub: user.id,
      provider: client.id,
      aud: client.id,
      iat: now,
      exp: refreshExp,
    } as const;

    const newRefreshToken = this.jwtTokenService.encodePayload(refreshPayload);

    const expires_in = Math.floor((expiryAt.getTime() - Date.now()) / 1000);

    const perms = this.permissionBitCalcService.decode(
      Number(existing.permissionBitMask),
    );
    const scopesOut = this.permissionService.permissionsToScopes(perms);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in,
      refresh_token: newRefreshToken,
      scope: scopesOut.join(' '),
    } as OAuthTokenResponseDto;
  }

  async revoke(body: OAuthTokenRevokeDto, user: PublicUser): Promise<void> {
    const clientId = body.client_id;
    if (!clientId) throw AppErrorCodes.INVALID_REQUEST;
    if (body.token) {
      const verify = await this.jwtTokenService.verifyJWTToken(body.token);
      if (verify.success && verify.payload) {
        const payload = verify.payload;
        if (payload.aud && payload.aud !== clientId) {
          throw AppErrorCodes.UNAUTHORIZED_CLIENT;
        }
        if (payload.sub && payload.sub !== user.id) {
          throw AppErrorCodes.UNAUTHORIZED;
        }
      }
    }

    try {
      await this.oauthGrantedTokenService.deleteByUserAndClient(
        user.id,
        clientId,
      );
    } catch (e) {
      if (e === AppErrorCodes.JWT_STATE_NOT_FOUND) {
        return;
      }
      throw e;
    }
  }
}
