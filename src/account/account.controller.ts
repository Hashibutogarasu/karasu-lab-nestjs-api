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
  Put,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from './account.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  SetPasswordDto,
} from './dto/password-reset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import type { User } from '@prisma/client';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiExtraModels, ApiNotFoundResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { EmailChangeRequestDto, EmailChangeVerifyDto, ResetPasswordResponseDto } from './account.dto';
import { AppErrorCodes } from '../types/error-codes';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  /**
   * サインイン済みユーザーのパスワード変更
   * JWTガードで保護されており、認証されたユーザーのみアクセス可能
   */
  @ApiBody({ type: ResetPasswordDto })
  @ApiBearerAuth()
  @ApiOkResponse({
    type: ResetPasswordResponseDto
  })
  @ApiNotFoundResponse(AppErrorCodes.USER_NOT_FOUND.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.NOW_PASSWORD_IS_NOT_INVALID.apiResponse)
  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@AuthUser() user: User, @Body() dto: ResetPasswordDto) {
    return await this.accountService.resetPassword(user.id, dto);
  }

  /**
   * パスワードリセット用のコード送信（サインインしていない場合）
   * メールアドレスを指定してリセットコードを送信
   */
  @ApiBody({ type: ForgotPasswordDto })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.accountService.forgotPassword(dto);
  }

  /**
   * リセットコードを使用したパスワード変更
   * 6桁のコードと新しいパスワードを指定
   */
  @ApiBody({ type: ConfirmResetPasswordDto })
  @Post('confirm-reset')
  async confirmResetPassword(@Body() dto: ConfirmResetPasswordDto) {
    return await this.accountService.confirmResetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: ExpressRequest) {
    const userId = req.user?.['id'];
    return await this.accountService.getProfile(userId);
  }

  @ApiBearerAuth()
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: ExpressRequest,
    @Body() body: UpdateUserNameDto,
  ) {
    const userId = req.user?.['id'];
    return await this.accountService.updateProfile(userId, body);
  }

  /**
   * 外部プロバイダーユーザーの新規パスワード設定
   * JWTガードで保護されており、パスワードを持たないユーザーのみ設定可能
   */
  @ApiBearerAuth()
  @ApiBody({ type: SetPasswordDto })
  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  async setPassword(
    @Request() req: ExpressRequest,
    @Body() dto: SetPasswordDto,
  ) {
    const userId = req.user?.['id'];
    return await this.accountService.setPassword(userId, dto);
  }

  @ApiBearerAuth()
  @ApiBody({ type: EmailChangeRequestDto })
  @Post('email/change')
  @UseGuards(JwtAuthGuard)
  async requestEmailChange(
    @AuthUser() user: User,
    @Body() body: EmailChangeRequestDto,
    @Res() res: Response,
  ) {
    const result = await this.accountService.requestEmailChange(
      user.id,
      body.newEmail,
    );
    return res.status(200).json(result);
  }

  @ApiBearerAuth()
  @ApiBody({ type: EmailChangeVerifyDto })
  @Post('email/change/verify')
  @UseGuards(JwtAuthGuard)
  async verifyEmailChange(
    @AuthUser() user: User,
    @Body() body: EmailChangeVerifyDto,
    @Res() res: Response,
  ) {
    const result = await this.accountService.verifyEmailChange(
      user.id,
      body.verificationCode,
    );
    return res.status(200).json(result);
  }

  /**
   * パスワード設定可能性チェック
   * JWT認証したユーザーが外部プロバイダーでパスワードを持たないかどうかを判定
   */
  @Get('can-set-password')
  @UseGuards(JwtAuthGuard)
  async canSetPassword(@Request() req: ExpressRequest, @AuthUser() user: User) {
    return await this.accountService.canSetPassword(user.id);
  }
}
