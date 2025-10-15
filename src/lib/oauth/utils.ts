import {
  cleanupExpiredTokens,
  getActiveTokensCount,
  getUserActiveTokensCount,
} from '../database/query';

/**
 * OAuth 2.0 システムのメンテナンス用ユーティリティ
 */

export interface SystemStats {
  activeAccessTokens: number;
  expiredTokensCleaned: boolean;
  lastCleanupTime: Date;
}

export interface UserTokenStats {
  userId: string;
  activeTokenCount: number;
}

/**
 * 期限切れトークンのクリーンアップを実行
 */
export async function performCleanup(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await cleanupExpiredTokens();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to cleanup expired tokens',
    };
  }
}

/**
 * システム統計情報を取得
 */
export async function getSystemStats(): Promise<SystemStats> {
  const activeTokens = await getActiveTokensCount();
  const cleanupResult = await performCleanup();

  return {
    activeAccessTokens: activeTokens,
    expiredTokensCleaned: cleanupResult.success,
    lastCleanupTime: new Date(),
  };
}

/**
 * ユーザー別のトークン統計を取得
 */
export async function getUserTokenStats(
  userId: string,
): Promise<UserTokenStats> {
  const activeTokenCount = await getUserActiveTokensCount(userId);

  return {
    userId,
    activeTokenCount,
  };
}

/**
 * 定期的なクリーンアップタスクを設定
 */
export class CleanupScheduler {
  private static interval: NodeJS.Timeout | null = null;

  /**
   * 定期クリーンアップを開始
   */
  static startScheduledCleanup(intervalMinutes: number = 60): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(
      () => {
        void (async () => {
          console.log('Starting scheduled token cleanup...');
          const result = await performCleanup();
          if (result.success) {
            console.log('Token cleanup completed successfully');
          } else {
            console.error('Token cleanup failed:', result.error);
          }
        })();
      },
      intervalMinutes * 60 * 1000,
    );

    console.log(
      `Scheduled token cleanup started (every ${intervalMinutes} minutes)`,
    );
  }

  /**
   * 定期クリーンアップを停止
   */
  static stopScheduledCleanup(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Scheduled token cleanup stopped');
    }
  }
}

/**
 * OAuth 2.0 エラーレスポンスのユーティリティ
 */
export class OAuth2ErrorHandler {
  /**
   * 標準的なOAuth 2.0エラーレスポンスを生成
   */
  static createErrorResponse(
    error: string,
    errorDescription?: string,
    errorUri?: string,
  ): {
    error: string;
    error_description?: string;
    error_uri?: string;
  } {
    const response: {
      error: string;
      error_description?: string;
      error_uri?: string;
    } = { error };

    if (errorDescription) {
      response.error_description = errorDescription;
    }

    if (errorUri) {
      response.error_uri = errorUri;
    }

    return response;
  }

  /**
   * HTTPステータスコードとエラーレスポンスのマッピング
   */
  static getHttpStatusForError(error: string): number {
    const statusMap: Record<string, number> = {
      invalid_request: 400,
      invalid_client: 401,
      invalid_grant: 400,
      unauthorized_client: 400,
      unsupported_grant_type: 400,
      invalid_scope: 400,
      access_denied: 403,
      unsupported_response_type: 400,
      server_error: 500,
      temporarily_unavailable: 503,
      invalid_token: 401,
    };

    return statusMap[error] || 400;
  }
}

/**
 * セキュリティ監査ログ
 */
export class SecurityAuditLogger {
  /**
   * OAuth 2.0関連のセキュリティイベントをログ
   */
  static logSecurityEvent(
    event: string,
    details: {
      clientId?: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      timestamp?: Date;
      [key: string]: any;
    },
  ): void {
    const logEntry = {
      event,
      timestamp: details.timestamp || new Date(),
      clientId: details.clientId,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      ...details,
    };

    // 実際の実装では適切なログシステムに送信
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
  }

  /**
   * 認可成功イベント
   */
  static logAuthorizationSuccess(
    clientId: string,
    userId: string,
    scope?: string,
  ): void {
    this.logSecurityEvent('authorization_success', {
      clientId,
      userId,
      scope,
    });
  }

  /**
   * 認可失敗イベント
   */
  static logAuthorizationFailure(
    clientId: string,
    error: string,
    reason?: string,
  ): void {
    this.logSecurityEvent('authorization_failure', {
      clientId,
      error,
      reason,
    });
  }

  /**
   * トークン発行イベント
   */
  static logTokenIssued(
    clientId: string,
    userId: string,
    grantType: string,
  ): void {
    this.logSecurityEvent('token_issued', {
      clientId,
      userId,
      grantType,
    });
  }

  /**
   * トークン失効イベント
   */
  static logTokenRevoked(clientId: string, tokenType: string): void {
    this.logSecurityEvent('token_revoked', {
      clientId,
      tokenType,
    });
  }
}
