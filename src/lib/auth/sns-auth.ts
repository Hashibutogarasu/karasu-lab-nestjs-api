import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface SnsProfile {
  providerId: string;
  provider: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  rawProfile: any;
}

export interface AuthStateRequest {
  provider: string;
  callbackUrl: string;
}

export interface AuthStateResponse {
  success: boolean;
  stateCode?: string;
  error?: string;
  errorDescription?: string;
}

export interface VerifyTokenRequest {
  stateCode: string;
  oneTimeToken: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  jwtId?: string;
  profile?: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    provider: string;
    roles: Role[];
    providers: string[];
  };
  user?: {
    roles: Role[];
  };
  token?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * 共通のコールバック処理
 */
@Injectable()
export class SnsAuthCallback {
  /**
   * コールバック処理の結果をフロントエンドにリダイレクト
   */
  buildCallbackRedirect(
    callbackUrl: string,
    stateCode: string,
    oneTimeToken: string,
    error?: string,
  ): string {
    const url = new URL(callbackUrl);

    if (error) {
      url.searchParams.set('error', error);
    } else {
      url.searchParams.set('state', stateCode);
      url.searchParams.set('token', oneTimeToken);
    }

    return url.toString();
  }
}
