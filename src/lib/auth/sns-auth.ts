/**
 * SNS OAuth認証のコア機能
 */

import {
  createAuthState,
  findAuthState,
  consumeAuthState,
  findAuthStateByToken,
  upsertExtraProfile,
  findExtraProfileByProvider,
  addUserProvider,
  createSnsUser,
  findUserByEmail,
  findUserById,
  updateAuthStateWithUser,
  generateRandomString,
  hashString,
  calculateExpiration,
} from '../database/query';
import { generateJWTToken } from './jwt-token';
import * as bcrypt from 'bcrypt';
import { IOAuthProvider } from './oauth-provider.interface';
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
 * 認証ステートを作成し、リダイレクトURLを生成
 * @param request.callbackUrl フロントエンドのコールバックURL（認証完了後の最終リダイレクト先）
 * @param oauthProvider OAuthプロバイダー
 * @returns 認証ステート
 */
export async function createAuthenticationState(
  request: AuthStateRequest,
  oauthProvider: IOAuthProvider,
): Promise<AuthStateResponse> {
  try {
    // ランダムなステートコードとワンタイムトークンを生成
    const stateCode = generateRandomString(32);
    const oneTimeToken = await bcrypt.hash(
      generateRandomString(32) + Date.now(),
      10,
    );

    // 有効期限を設定（15分）
    const expiresAt = calculateExpiration(15);

    // PKCE対応（X用）
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    let codeChallengeMethod: string | undefined;

    if (
      request.provider === 'x' &&
      oauthProvider.generateCodeVerifier &&
      oauthProvider.generateCodeChallenge
    ) {
      codeVerifier = oauthProvider.generateCodeVerifier();
      codeChallenge = oauthProvider.generateCodeChallenge(codeVerifier);
      codeChallengeMethod = 'S256';
    }

    // データベースに保存（callbackUrlはフロントエンドのコールバックURL）
    await createAuthState({
      stateCode,
      oneTimeToken,
      provider: request.provider,
      callbackUrl: request.callbackUrl,
      expiresAt,
      codeVerifier,
      codeChallenge,
      codeChallengeMethod,
    });

    // 注意: この関数ではリダイレクトURLを返しますが、
    // 実際の外部プロバイダーへのリダイレクトURLはコントローラー側で
    // バックエンドのコールバックURIを使って生成されます
    return {
      success: true,
      stateCode,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: 'server_error',
      errorDescription: 'Failed to create authentication state',
    };
  }
}

/**
 * SNSプロファイルを処理してユーザーを作成または更新
 */
export async function processSnsCProfile(
  snsProfile: SnsProfile,
  stateCode: string,
): Promise<{
  success?: boolean;
  userId?: string;
  oneTimeToken?: string;
  error?: string;
}> {
  try {
    // ステートコードを検証
    const authState = await findAuthState(stateCode);
    if (!authState || authState.used || authState.expiresAt < new Date()) {
      return {
        success: false,
        error: 'invalid_state',
      };
    }

    // マッチング戦略:
    // 1) まず受け取ったメールアドレスで既存ユーザーを探す（メールで見つかればそのユーザーに紐付ける）
    // 2) メールで見つからなければ、プロバイダーID(providerId+provider)でExtraProfileが存在するか確認する
    //    存在すればそのユーザーを使用する（メールが変わっていても紐付けを維持するため）
    // 3) どちらでも見つからなければ新規ユーザーを作成する

    let user;

    // 1) メールでのマッチングを優先
    if (snsProfile.email) {
      user = await findUserByEmail(snsProfile.email);
    }

    // 2) メールで見つからなければプロバイダーIDでExtraProfileを探す
    let existingProfile;
    if (!user) {
      existingProfile = await findExtraProfileByProvider(
        snsProfile.providerId,
        snsProfile.provider,
      );

      if (existingProfile) {
        user = existingProfile.user;
      }
    }

    // 3) 新規ユーザー作成または既存ユーザーにプロバイダーを追加
    if (!user) {
      const username = generateUniqueUsername(
        snsProfile.displayName || snsProfile.email || snsProfile.providerId,
      );
      user = await createSnsUser({
        username,
        email:
          snsProfile.email ||
          `${snsProfile.providerId}@${snsProfile.provider}.local`,
        provider: snsProfile.provider,
      });

      // 新規ユーザーの場合はExtraProfileを作成
      await upsertExtraProfile({
        userId: user.id,
        provider: snsProfile.provider,
        providerId: snsProfile.providerId,
        displayName: snsProfile.displayName,
        email: snsProfile.email,
        avatarUrl: snsProfile.avatarUrl,
        rawProfile: snsProfile.rawProfile,
      });
    } else {
      // 既存ユーザーが見つかった場合、ExtraProfileが既に存在すれば更新、存在しなければ作成
      await upsertExtraProfile({
        userId: user.id,
        provider: snsProfile.provider,
        providerId: snsProfile.providerId,
        displayName: snsProfile.displayName,
        email: snsProfile.email,
        avatarUrl: snsProfile.avatarUrl,
        rawProfile: snsProfile.rawProfile,
      });

      // ユーザーのproviders配列にプロバイダーを追加
      await addUserProvider(user.id, snsProfile.provider);
    }

    // 認証ステートにユーザーIDを保存（後でverifyAndCreateTokenで使用）
    await updateAuthStateWithUser(stateCode, user.id);

    return {
      success: true,
      userId: user.id,
      oneTimeToken: authState.oneTimeToken,
    };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
    };
  }
}

/**
 * ユニークなユーザー名を生成
 */
function generateUniqueUsername(baseName: string): string {
  // メールアドレスの場合は@より前を使用
  let username = baseName.includes('@') ? baseName.split('@')[0] : baseName;

  // 英数字のみに変換
  username = username.replace(/[^a-zA-Z0-9]/g, '');

  // 最低3文字確保
  if (username.length < 3) {
    username = 'user' + username;
  }

  // 重複防止のためランダム数字を追加
  username += Math.floor(Math.random() * 10000);

  return username.toLowerCase();
}

/**
 * ワンタイムトークンを検証してJWTを発行
 */
export async function verifyAndCreateToken(
  request: VerifyTokenRequest,
): Promise<VerifyTokenResponse> {
  try {
    // ステートコードとワンタイムトークンを検証
    const authState = await findAuthState(request.stateCode);
    if (
      !authState ||
      authState.used ||
      authState.expiresAt < new Date() ||
      authState.oneTimeToken !== request.oneTimeToken
    ) {
      return {
        success: false,
        error: 'invalid_token',
        errorDescription: 'Invalid or expired authentication token',
      };
    }

    // 認証ステートにユーザーIDが保存されているかチェック
    if (!authState.userId) {
      return {
        success: false,
        error: 'invalid_state',
        errorDescription:
          'Authentication state does not contain user information',
      };
    }

    // ステートを消費（使用済みにする）
    await consumeAuthState(request.stateCode);

    // ユーザー情報を取得
    const user = await findUserById(authState.userId);
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        errorDescription: 'User associated with authentication state not found',
      };
    }

    // JWTトークンを生成
    const tokenResult = await generateJWTToken({
      userId: user.id,
      provider: authState.provider,
      expirationHours: 1,
    });

    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error || 'token_generation_failed',
        errorDescription:
          tokenResult.errorDescription || 'Failed to generate JWT token',
      };
    }

    return {
      success: true,
      jwtId: tokenResult.jwtId,
      profile: {
        sub: user.id,
        name: user.username,
        email: user.email,
        roles: user.roles,
        provider: authState.provider,
        providers: user.providers || [authState.provider],
      },
      user: {
        roles: user.roles,
      },
      token: tokenResult.token,
    };
  } catch (error) {
    return {
      success: false,
      error: 'server_error',
      errorDescription: 'Failed to verify authentication token',
    };
  }
}

/**
 * 共通のコールバック処理
 */
export class SnsAuthCallback {
  /**
   * コールバック処理の結果をフロントエンドにリダイレクト
   */
  static buildCallbackRedirect(
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

  /**
   * エラーレスポンス用のリダイレクト
   */
  static buildErrorRedirect(callbackUrl: string, error: string): string {
    return this.buildCallbackRedirect(callbackUrl, '', '', error);
  }
}
