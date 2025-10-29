import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Optional,
  UseGuards,
  Get,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { AuthUser } from '../decorators/auth-user.decorator';
import type { PublicUser } from '../decorators/auth-user.decorator';
import { AppErrorCodes } from '../../types/error-codes';
import { TotpService } from '../../totp/totp.service';
import { MfaService } from '../../data-base/query/mfa/mfa.service';
import { JwtTokenService } from '../jwt-token/jwt-token.service';
import {
  MfaGetBackupCodesResponseDto,
  MfaSetupResponseDto,
  MfaVerifyDto,
  MfaVerifyResponseDto,
} from './mfa.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ApiWrappedOkResponse } from '../../decorators/api-wrapped-ok-response/api-wrapped-ok-response.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly totp: TotpService,
    private readonly jwtTokenService: JwtTokenService,
  ) { }

  @ApiCreatedResponse({ type: MfaSetupResponseDto })
  @Post('setup')
  async setup(@AuthUser() user: PublicUser, @Res() res: Response) {
    const rawSecret = this.totp.generateSecret();

    const issuerId = process.env.TOTP_ISSUER!;

    try {
      const result = await this.mfaService.setupTotpForUser(
        user.id,
        issuerId,
        rawSecret,
      );

      const otpauth = this.totp.generateTotpUrl(
        user.email || user.username,
        issuerId,
        rawSecret,
      );

      return res.status(HttpStatus.CREATED).json({
        message: 'MFA setup created',
        otpauth,
        secret: rawSecret,
        backup_codes: result.backupCodes,
      });
    } catch (err: any) {
      if (err === AppErrorCodes.CONFLICT) {
        throw AppErrorCodes.CONFLICT;
      }
      throw err;
    }
  }

  @ApiWrappedOkResponse({ type: MfaGetBackupCodesResponseDto })
  @Get('backup-codes')
  async getBackupCodes(@AuthUser() user: PublicUser, @Res() res: Response) {
    if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
    const result = await this.mfaService.regenerateBackupCodesForUser(user.id);
    return res.status(HttpStatus.OK).json({
      message: 'Backup codes regenerated',
      backup_codes: result.backupCodes,
    });
  }

  @Delete()
  async disableMfa(@AuthUser() user: PublicUser, @Res() res: Response) {
    if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
    await this.mfaService.disableMfaForUser(user.id);
    return res.status(HttpStatus.OK).json({ message: 'MFA disabled' });
  }

  @ApiWrappedOkResponse({ type: MfaVerifyResponseDto })
  @ApiInternalServerErrorResponse(
    AppErrorCodes.TOKEN_GENERATION_FAILED.apiResponse,
  )
  @ApiInternalServerErrorResponse(
    AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse,
  )
  @ApiBadRequestResponse(AppErrorCodes.INVALID_TOKEN.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.MFA_NOT_ENABLED.apiResponse)
  @Post('verify')
  async verify(
    @Body() body: MfaVerifyDto,
    @Res() res: Response,
  ): Promise<void> {
    const { mfaToken, code } = body;
    const verifyResult = await this.jwtTokenService.verifyJWTToken(mfaToken);
    if (!verifyResult.success || !verifyResult.payload) {
      throw AppErrorCodes.INVALID_TOKEN;
    }

    const userId = verifyResult.payload.sub;
    const jwtStateId = verifyResult.payload.jti;

    if (!userId) throw AppErrorCodes.INVALID_TOKEN;

    if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
    if (!this.authService) throw AppErrorCodes.INTERNAL_SERVER_ERROR;

    await this.mfaService.verifyToken(userId, code);

    const tokenResult = await this.jwtTokenService.generateJWTToken({
      userId,
      expirationHours: 1,
      jwtStateId,
    });
    if (
      !tokenResult.success ||
      !tokenResult.accessToken ||
      !tokenResult.refreshToken
    ) {
      throw AppErrorCodes.TOKEN_GENERATION_FAILED;
    }

    res.status(HttpStatus.OK).json({
      message: 'MFA verification successful',
      jti: tokenResult.jti,
      access_token: tokenResult.accessToken,
      token_type: 'Bearer',
      expires_in: 60 * 60,
      refresh_token: tokenResult.refreshToken,
      refresh_expires_in: 60 * 60 * 24 * 30,
    });
  }
}
