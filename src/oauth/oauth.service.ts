import { Injectable } from '@nestjs/common';
import { OAuthAuthorizeQuery, OAuthTokenBodyDto, OAuthTokenResponseDto, OAuthTokenRevokeDto } from './oauth.dto';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class OauthService {

  async authorize(params: OAuthAuthorizeQuery) {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }

  async token(body: OAuthTokenBodyDto): Promise<OAuthTokenResponseDto> {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }

  async revoke(body: OAuthTokenRevokeDto): Promise<void> {
    throw AppErrorCodes.NOT_IMPLEMENTED;
  }
}
