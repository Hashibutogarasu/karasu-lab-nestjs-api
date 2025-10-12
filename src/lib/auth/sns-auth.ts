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
  redirectUrl?: string;
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
    providers: string[];
  };
  user?: {
    role: string;
  };
  token?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * 認証ステートを作成し、リダイレクトURLを生成
 */
export async function createAuthenticationState(
  request: AuthStateRequest,
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

    // データベースに保存
    await createAuthState({
      stateCode,
      oneTimeToken,
      provider: request.provider,
      callbackUrl: request.callbackUrl,
      expiresAt,
    });

    return {
      success: true,
      stateCode,
      redirectUrl: generateProviderRedirectUrl(request.provider, stateCode),
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
 * プロバイダー別のリダイレクトURL生成
 */
function generateProviderRedirectUrl(
  provider: string,
  stateCode: string,
): string {
  const baseUrl = process.env.BASE_URL!;
  // APIのコールバックエンドポイントを使用
  const apiCallbackUrl = `${baseUrl}/auth/callback`;

  switch (provider) {
    case 'google': {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const scopes = 'openid profile email';
      return (
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code&` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(apiCallbackUrl)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${stateCode}`
      );
    }

    case 'discord': {
      const discordClientId = process.env.DISCORD_CLIENT_ID;
      const scopes = 'identify email'; // デフォルトスコープ
      return (
        `https://discord.com/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${discordClientId}&` +
        `redirect_uri=${encodeURIComponent(apiCallbackUrl)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${stateCode}`
      );
    }

    // 将来的に他のプロバイダーを追加可能
    case 'x':
      // Twitter/X OAuth implementation would go here
      throw new Error('X OAuth not implemented yet');

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * SNSプロファイルを処理してユーザーを作成または更新
 */
export async function processSnsCProfile(
  snsProfile: SnsProfile,
  stateCode: string,
): Promise<{
  success: boolean;
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

    // 既存のプロファイルをチェック
    let user;
    const existingProfile = await findExtraProfileByProvider(
      snsProfile.providerId,
      snsProfile.provider,
    );

    if (existingProfile) {
      // 既存ユーザー
      user = existingProfile.user;

      // プロファイル情報を更新
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
      // 新規ユーザーまたはメールアドレスでマッチング
      if (snsProfile.email) {
        user = await findUserByEmail(snsProfile.email);
      }

      if (!user) {
        // 新規ユーザー作成
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
      } else {
        // 既存ユーザーにプロバイダーを追加
        await addUserProvider(user.id, snsProfile.provider);
      }

      // ExtraProfileを作成
      await upsertExtraProfile({
        userId: user.id,
        provider: snsProfile.provider,
        providerId: snsProfile.providerId,
        displayName: snsProfile.displayName,
        email: snsProfile.email,
        avatarUrl: snsProfile.avatarUrl,
        rawProfile: snsProfile.rawProfile,
      });
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
        provider: authState.provider,
        providers: user.providers || [authState.provider],
      },
      user: {
        role: user.role,
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
