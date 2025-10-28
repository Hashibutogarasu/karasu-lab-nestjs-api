import { Injectable } from '@nestjs/common';
import {
  AuthStateRequest,
  AuthStateResponse,
  SnsProfile,
  VerifyTokenRequest,
} from '../../../lib/auth/sns-auth';
import { IOAuthProvider } from '../../../lib/auth/oauth-provider.interface';
import { OAuthProviderFactory } from '../../../lib/auth/oauth-provider.factory';
import { UtilityService } from '../../../data-base/utility/utility.service';
import * as bcrypt from 'bcrypt';
import { AuthStateService } from '../../../data-base/query/auth-state/auth-state.service';
import { UserService } from '../../../data-base/query/user/user.service';
import { JwtTokenService } from '../../jwt-token/jwt-token.service';
import { ExtraProfileService } from '../../../data-base/query/extra-profile/extra-profile.service';
import { ExternalProviderAuthResult } from './auth.core.dto';
import { AppErrorCodes } from '../../../types/error-codes';

@Injectable()
export class AuthCoreService {
  constructor(
    private readonly utilityService: UtilityService,
    private readonly authStateService: AuthStateService,
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly extraProfileService: ExtraProfileService,
    private readonly oauthProviderFactory: OAuthProviderFactory,
  ) {}

  /**
   * 認証ステートを作成し、リダイレクトURLを生成
   * @param request.callbackUrl フロントエンドのコールバックURL（認証完了後の最終リダイレクト先）
   * @param oauthProvider OAuthプロバイダー
   * @returns 認証ステート
   */
  async createAuthenticationState(
    request: AuthStateRequest,
    oauthProvider: IOAuthProvider,
  ): Promise<AuthStateResponse> {
    try {
      // ランダムなステートコードとワンタイムトークンを生成
      const stateCode = this.utilityService.generateRandomString(32);
      const oneTimeToken = await bcrypt.hash(
        this.utilityService.generateRandomString(32) + Date.now(),
        10,
      );

      // 有効期限を設定（15分）
      const expiresAt = this.utilityService.calculateExpiration(15);

      // PKCE対応（X用）
      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;
      let codeChallengeMethod: string | undefined;

      // PKCE 判定はファクトリーに委譲（プロバイダー実装に依存せず判定できるように）
      if (
        this.oauthProviderFactory.isPKCERequired(request.provider) &&
        oauthProvider.generateCodeVerifier &&
        oauthProvider.generateCodeChallenge
      ) {
        codeVerifier = oauthProvider.generateCodeVerifier();
        codeChallenge = oauthProvider.generateCodeChallenge(codeVerifier);
        codeChallengeMethod = 'S256';
      }

      // データベースに保存（callbackUrlはフロントエンドのコールバックURL）
      await this.authStateService.createAuthState({
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
  async processSnsProfile(
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
      const authState = await this.authStateService.findAuthState(stateCode);
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
        user = await this.userService.findUserByEmail(snsProfile.email);
      }

      // 2) メールで見つからなければプロバイダーIDでExtraProfileを探す
      let existingProfile;
      if (!user) {
        existingProfile =
          await this.extraProfileService.findExtraProfileByProvider(
            snsProfile.providerId,
            snsProfile.provider,
          );

        if (existingProfile) {
          user = existingProfile.user;
        }
      }

      // 3) 新規ユーザー作成または既存ユーザーにプロバイダーを追加
      if (!user) {
        const username = this.generateUniqueUsername(
          snsProfile.displayName || snsProfile.email || snsProfile.providerId,
        );
        user = await this.userService.createSnsUser({
          username,
          email:
            snsProfile.email ||
            `${snsProfile.providerId}@${snsProfile.provider}.local`,
          provider: snsProfile.provider,
        });

        // 新規ユーザーの場合はExtraProfileを作成
        await this.extraProfileService.upsertExtraProfile({
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
        await this.extraProfileService.upsertExtraProfile({
          userId: user.id,
          provider: snsProfile.provider,
          providerId: snsProfile.providerId,
          displayName: snsProfile.displayName,
          email: snsProfile.email,
          avatarUrl: snsProfile.avatarUrl,
          rawProfile: snsProfile.rawProfile,
        });

        // ユーザーのproviders配列にプロバイダーを追加
        await this.userService.addUserProvider(user.id, snsProfile.provider);
      }

      // 認証ステートにユーザーIDを保存（後でverifyAndCreateTokenで使用）
      await this.authStateService.updateAuthStateWithUser(stateCode, user.id);

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
  generateUniqueUsername(baseName: string): string {
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
  async verifyAndCreateToken(
    request: VerifyTokenRequest,
  ): Promise<ExternalProviderAuthResult> {
    try {
      // ステートコードとワンタイムトークンを検証
      const authState = await this.authStateService.findAuthState(
        request.stateCode,
      );
      if (
        !authState ||
        authState.used ||
        authState.expiresAt < new Date() ||
        authState.oneTimeToken !== request.oneTimeToken
      ) {
        throw AppErrorCodes.INVALID_AUTH_STATE;
      }

      if (!authState.userId) {
        throw AppErrorCodes.INVALID_AUTH_STATE;
      }

      // ステートを消費（使用済みにする）
      await this.authStateService.consumeAuthState(request.stateCode);

      // ユーザー情報を取得
      const user = await this.userService.findUserById(authState.userId);
      if (!user) {
        throw AppErrorCodes.USER_NOT_FOUND;
      }

      // JWTトークンを生成
      const token = await this.jwtTokenService.generateJWTToken({
        userId: user.id,
        provider: authState.provider,
        expirationHours: 1,
      });

      if (!token.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      return {
        jti: token.jti,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        userId: user.id,
      };
    } catch (error) {
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

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
