import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  SetPasswordDto,
} from './dto/password-reset.dto';
import {
  findUserByEmail,
  findUserById,
  createPasswordReset,
  findValidPasswordReset,
  markPasswordResetAsUsed,
  updateUserPassword,
  verifyUserPassword,
  updateUserNameById,
} from '../lib/database/query';
import { ResendService } from '../resend/resend.service';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { AppErrorCodes } from '../types/error-codes';

@Injectable()
export class AccountService {
  constructor(private readonly resendService: ResendService) {}
  /**
   * サインイン済みユーザーのパスワード変更（旧パスワード必要）
   */
  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await findUserById(userId, { passwordHash: true });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    // SNSユーザー（パスワードハッシュがnull）の場合は、旧パスワード検証をスキップ
    if (user.passwordHash) {
      const verifiedUser = await verifyUserPassword(
        user.username,
        dto.oldPassword,
      );
      if (!verifiedUser) {
        throw AppErrorCodes.NOW_PASSWORD_IS_NOT_INVALID;
      }
    }

    const updatedUser = await updateUserPassword(userId, dto.newPassword);
    return {
      message: 'Password updated successfully',
      user: updatedUser,
    };
  }

  /**
   * パスワードリセット用のコード送信（サインインしていない場合）
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await findUserByEmail(dto.email);
    if (!user) {
      // セキュリティ上、ユーザーが存在しない場合でも成功レスポンスを返す
      return {
        message:
          'A password reset code has been sent to the specified email address',
      };
    }

    const resetData = await createPasswordReset(user.id);

    // メールを送信
    try {
      await this.resendService.sendEmail({
        to: user.email,
        subject: 'パスワードリセットのご案内',
        html: `
          <h2>パスワードリセット</h2>
          <p>パスワードリセットをご希望のお客様</p>
          <p>以下のリセットコードをご利用ください：</p>
          <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${resetData.resetCode}</h3>
          <p>このコードの有効期限は <strong>${resetData.expiresAt.toLocaleString('ja-JP')}</strong> までです。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
        from: process.env.RESEND_FROM_EMAIL!,
      });
    } catch (error) {
      console.error('メール送信に失敗しました:', error);
      // メール送信に失敗した場合でもエラーを返さない（セキュリティ上の理由）
    }

    return {
      message:
        '指定されたメールアドレスにパスワードリセット用のコードを送信しました',
    };
  }

  /**
   * リセットコードを使用したパスワード変更
   */
  async confirmResetPassword(dto: ConfirmResetPasswordDto) {
    const passwordReset = await findValidPasswordReset(dto.resetCode);
    if (!passwordReset) {
      throw AppErrorCodes.INVALID_RESET_CODE;
    }

    // パスワードを更新
    const updatedUser = await updateUserPassword(
      passwordReset.userId,
      dto.newPassword,
    );

    // リセットコードを使用済みにマーク
    await markPasswordResetAsUsed(passwordReset.id);

    return {
      message: 'Password has been reset successfully',
      user: updatedUser,
    };
  }

  async getProfile(userId: string) {
    const user = await findUserById(userId, { passwordHash: true });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }
    const { passwordHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateUserNameDto) {
    const user = await findUserById(userId);
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    try {
      await updateUserNameById(userId, dto.username);
      return {
        message: 'Username updated successfully',
      };
    } catch {
      throw AppErrorCodes.ALREADY_TAKEN_USERNAME;
    }
  }

  /**
   * 外部プロバイダーユーザーの新規パスワード設定
   * パスワードハッシュがnullのユーザーのみ設定可能
   */
  async setPassword(userId: string, dto: SetPasswordDto) {
    const user = await findUserById(userId, { passwordHash: true });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    // 既にパスワードが設定されている場合はエラー
    if (user.passwordHash) {
      throw AppErrorCodes.PASSWORD_ALREADY_SET;
    }

    const updatedUser = await updateUserPassword(userId, dto.newPassword);
    return {
      message: 'Password set successfully',
      user: updatedUser,
    };
  }

  /**
   * パスワード設定可能性チェック
   * JWT認証したユーザーが外部プロバイダーでパスワードを持たないかどうかを判定
   */
  async canSetPassword(userId: string) {
    const user = await findUserById(userId, { passwordHash: true });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    const canSetPassword = !user.passwordHash && user.providers.length > 0;

    return {
      canSetPassword,
      hasPassword: !!user.passwordHash,
      hasExternalProviders: user.providers.length > 0,
      providers: user.providers,
    };
  }
}
