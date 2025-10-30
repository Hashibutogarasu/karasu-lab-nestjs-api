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
import { AppErrorCode, AppErrorCodes } from '../../../types/error-codes';
import { PublicUser } from '../../decorators/auth-user.decorator';

@Injectable()
export class AuthCoreService {
  constructor(
    private readonly utilityService: UtilityService,
    private readonly authStateService: AuthStateService,
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly extraProfileService: ExtraProfileService,
    private readonly oauthProviderFactory: OAuthProviderFactory,
  ) { }

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
      // request.userId があれば、リンクフローとして userId を保存する
      await this.authStateService.createAuthState({
        stateCode,
        oneTimeToken,
        provider: request.provider,
        callbackUrl: request.callbackUrl,
        expiresAt,
        codeVerifier,
        codeChallenge,
        codeChallengeMethod,
        userId: request.userId,
      });

      return {
        success: true,
        stateCode,
      };
    } catch (error) {
      throw AppErrorCodes.AUTH_STATE_CREATION_FAILED;
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
      // 1) providerId で ExtraProfile を探す（最優先）
      // 2) 見つからなければ受け取ったメールアドレスで既存ユーザーを探す
      // 3) どちらでも見つからなければ新規ユーザーを作成する
      // 注意: 既存のメールユーザーがパスワードを持っている場合は、自動でプロバイダーを
      // 追加せず、フロントエンド側でリンク確認（link/verify）を要求するためのフローにする

      // 新しい仕様:
      // - authState.userId が存在する場合は「リンクフロー」
      //   -> providerId が既に存在すればエラー (別ユーザーに紐づいている)
      //   -> 存在しなければ target user に ExtraProfile を作成するが、
      //      providers 配列への追加は検証後に行うためここでは addUserProvider しない
      // - authState.userId が存在しない場合は通常ログインフロー
      //   -> providerId が既に存在すればそのユーザーでログイン
      //   -> providerId が見つからず、メールアドレスが DB に存在する場合は CONFLICT を返す
      //   -> どちらも見つからなければ新規ユーザー作成してログイン（ExtraProfile 作成と providers 追加を行う）

      const existingProfile =
        await this.extraProfileService.findExtraProfileByProvider(
          snsProfile.providerId,
          snsProfile.provider,
        );

      // --- リンクフロー ---
      if (authState.userId) {
        if (existingProfile && existingProfile.linkingVerified) {
          throw AppErrorCodes.CONFLICT.setCustomMessage(
            'External provider already linked to another account',
          );
        }

        const targetUser = await this.userService.findUserById(
          authState.userId,
        );
        if (!targetUser) {
          throw AppErrorCodes.USER_NOT_FOUND;
        }

        await this.extraProfileService.upsertExtraProfile({
          userId: targetUser.id,
          provider: snsProfile.provider,
          providerId: snsProfile.providerId,
          displayName: snsProfile.displayName,
          email: snsProfile.email,
          avatarUrl: snsProfile.avatarUrl,
          rawProfile: snsProfile.rawProfile,
        });

        await this.authStateService.updateAuthStateWithUser(
          stateCode,
          targetUser.id,
        );

        return {
          success: true,
          userId: targetUser.id,
          oneTimeToken: authState.oneTimeToken,
        };
      }

      // --- 通常ログインフロー ---
      let user = null as PublicUser | null;
      if (existingProfile) {
        user = existingProfile.user;
        // update profile record with fresh data
        await this.extraProfileService.upsertExtraProfile({
          userId: user.id,
          provider: snsProfile.provider,
          providerId: snsProfile.providerId,
          displayName: snsProfile.displayName,
          email: snsProfile.email,
          avatarUrl: snsProfile.avatarUrl,
          rawProfile: snsProfile.rawProfile,
        });
      } else if (snsProfile.email) {
        const emailUser = await this.userService.findUserByEmail(
          snsProfile.email,
        );
        if (emailUser) {
          throw AppErrorCodes.CONFLICT.setCustomMessage(
            'Email already exists in database',
          );
        }
      }

      // 新規ユーザー作成（providerId でも email でも未検出）
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

        // 新規ユーザーの場合は ExtraProfile を作成し、プロバイダーを追加する
        await this.extraProfileService.upsertExtraProfile({
          userId: user.id,
          provider: snsProfile.provider,
          providerId: snsProfile.providerId,
          displayName: snsProfile.displayName,
          email: snsProfile.email,
          avatarUrl: snsProfile.avatarUrl,
          rawProfile: snsProfile.rawProfile,
        });
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
      if (error instanceof AppErrorCode) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
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
        jwtStateId: request.jwtStateId,
      });

      if (!token.success) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      const authProvider = this.oauthProviderFactory.getProvider(authState.provider);

      return {
        success: true,
        id: token.id,
        jti: token.jti,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        userId: user.id,
        provider: authProvider.getProvider() ?? 'external',
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
