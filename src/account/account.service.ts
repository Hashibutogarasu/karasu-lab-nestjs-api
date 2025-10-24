import { Injectable } from '@nestjs/common';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  SetPasswordDto,
} from './dto/password-reset.dto';
import { ResendService } from '../resend/resend.service';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { AppErrorCodes } from '../types/error-codes';
import { UserService } from '../data-base/query/user/user.service';
import { PasswordService } from '../data-base/utility/password/password.service';
import { PendingEmailChangeProcessService } from '../data-base/query/pending-email-change-process/pending-email-change-process.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly resendService: ResendService,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly pendingEmailChangeProcessService: PendingEmailChangeProcessService,
  ) {}

  /**
   * サインイン済みユーザーのパスワード変更（旧パスワード必要）
   */
  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await this.userService.findUserById(userId, {
      passwordHash: true,
    });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    if (user.passwordHash) {
      const verifiedUser = await this.userService.verifyUserPassword(
        user.username,
        dto.oldPassword,
      );
      if (!verifiedUser) {
        throw AppErrorCodes.NOW_PASSWORD_IS_NOT_INVALID;
      }
    }

    const updatedUser = await this.passwordService.updateUserPassword(
      userId,
      dto.newPassword,
    );

    return {
      message: 'Password updated successfully',
      user: updatedUser,
    };
  }

  /**
   * パスワードリセット用のコード送信（サインインしていない場合）
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      return {
        message:
          'A password reset code has been sent to the specified email address',
      };
    }

    const resetData = await this.passwordService.createPasswordReset(user.id);

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
      // ignore errors
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
    const passwordReset = await this.passwordService.findValidPasswordReset(
      dto.resetCode,
    );
    if (!passwordReset) {
      throw AppErrorCodes.INVALID_RESET_CODE;
    }

    const updatedUser = await this.passwordService.updateUserPassword(
      passwordReset.userId,
      dto.newPassword,
    );

    await this.passwordService.markPasswordResetAsUsed(passwordReset.id);

    return {
      message: 'Password has been reset successfully',
      user: updatedUser,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userService.findUserById(userId, {
      passwordHash: true,
    });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }
    const { passwordHash, ...profile } = user;
    return profile;
  }

  /**
   * メールアドレス変更リクエストを作成し、確認コードを送信する
   */
  async requestEmailChange(userId: string, newEmail: string) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    const existing = await this.userService.findUserByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw AppErrorCodes.EMAIL_ALREADY_IN_USE;
    }

    const pending =
      await this.pendingEmailChangeProcessService.createPendingEmailChangeProcess(
        {
          userId,
          newEmail,
        },
      );

    try {
      const frontendUrl = `${process.env.FRONTEND_URL}/email/change/confirm`;
      await this.resendService.sendEmail({
        to: newEmail,
        subject: 'メールアドレス変更の確認コード',
        from: process.env.RESEND_FROM_EMAIL!,
        html: `
          <p>こんにちは、${user.username}さん</p>
          <p>メールアドレスの確認をするため、下の6桁の確認コードを<a href="${frontendUrl}">ここ</a>に入力して変更を確定してください。</p>
          <p>確認コード：</p>
          <h2>${pending.verificationCode}</h2>
          <p>または、以下のリンク、<a href="${frontendUrl}?code=${pending.verificationCode}">こちら</a>をクリックしてください。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
          <p>このコードの有効期限は30分です。</p>
          <p>確認コードを入力する前に、変更したいアカウントでログインしている必要があります。</p>
        `,
      });
    } catch {
      // ignore errors
    }

    return {
      message: 'Verification code sent to new email address',
    };
  }

  /**
   * 確認コードを検証してユーザーのメールアドレスを更新する
   */
  async verifyEmailChange(userId: string, code: string) {
    const user = await this.userService.findUserById(userId);
    if (!user) throw AppErrorCodes.USER_NOT_FOUND;

    const pending =
      await this.pendingEmailChangeProcessService.findPendingByCode(
        userId,
        code,
      );
    if (!pending) throw AppErrorCodes.INVALID_REQUEST;

    const updated = await this.userService.updateUser(userId, {
      email: pending.newEmail,
    });

    await this.pendingEmailChangeProcessService.markPendingAsUsed(pending.id);

    try {
      await this.pendingEmailChangeProcessService.deletePendingById(pending.id);
    } catch (err) {
      console.error('Failed to delete pending email change record', err);
    }

    return {
      message: 'Email address updated successfully',
      user: updated,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserNameDto) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    try {
      await this.userService.updateUserNameById(userId, dto.username);
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
    const user = await this.userService.findUserById(userId, {
      passwordHash: true,
    });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }

    if (user.passwordHash) {
      throw AppErrorCodes.PASSWORD_ALREADY_SET;
    }

    const updatedUser = await this.passwordService.updateUserPassword(
      userId,
      dto.newPassword,
    );
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
    const user = await this.userService.findUserById(userId, {
      passwordHash: false,
    });
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
