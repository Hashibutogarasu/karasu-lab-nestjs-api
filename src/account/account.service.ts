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
} from './dto/password-reset.dto';
import {
  findUserByEmail,
  findUserById,
  createPasswordReset,
  findValidPasswordReset,
  markPasswordResetAsUsed,
  updateUserPassword,
  verifyUserPassword,
} from '../lib/database/query';
import { ResendService } from '../resend/resend.service';

@Injectable()
export class AccountService {
  constructor(private readonly resendService: ResendService) {}
  /**
   * サインイン済みユーザーのパスワード変更（旧パスワード必要）
   */
  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await findUserById(userId);
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    // SNSユーザー（パスワードハッシュがnull）の場合は、旧パスワード検証をスキップ
    if (user.passwordHash) {
      const { isValid } = await verifyUserPassword(
        user.username,
        dto.oldPassword,
      );
      if (!isValid) {
        throw new UnauthorizedException('現在のパスワードが正しくありません');
      }
    }

    const updatedUser = await updateUserPassword(userId, dto.newPassword);
    return {
      message: 'パスワードが正常に更新されました',
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
          '指定されたメールアドレスにパスワードリセット用のコードを送信しました',
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
      throw new BadRequestException(
        '無効なリセットコードか、有効期限が切れています',
      );
    }

    // パスワードを更新
    const updatedUser = await updateUserPassword(
      passwordReset.userId,
      dto.newPassword,
    );

    // リセットコードを使用済みにマーク
    await markPasswordResetAsUsed(passwordReset.id);

    return {
      message: 'パスワードが正常にリセットされました',
      user: updatedUser,
    };
  }
}
