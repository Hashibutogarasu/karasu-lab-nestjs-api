import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from './account.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
} from './dto/password-reset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  /**
   * サインイン済みユーザーのパスワード変更
   * JWTガードで保護されており、認証されたユーザーのみアクセス可能
   */
  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(
    @Request() req: any,
    @Body() dto: ResetPasswordDto,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user.id;
    const result = await this.accountService.resetPassword(userId, dto);
    res.status(HttpStatus.OK).json(result);
  }

  /**
   * パスワードリセット用のコード送信（サインインしていない場合）
   * メールアドレスを指定してリセットコードを送信
   */
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.accountService.forgotPassword(dto);
    res.status(HttpStatus.OK).json(result);
  }

  /**
   * リセットコードを使用したパスワード変更
   * 6桁のコードと新しいパスワードを指定
   */
  @Post('confirm-reset')
  async confirmResetPassword(
    @Body() dto: ConfirmResetPasswordDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.accountService.confirmResetPassword(dto);
    res.status(HttpStatus.OK).json(result);
  }
}
