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
import { MfaService } from '../../mfa/mfa.service';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { AuthUser } from '../decorators/auth-user.decorator';
import type { PublicUser } from '../decorators/auth-user.decorator';
import {
  verifyJWTToken,
  generateJWTToken,
  generateRefreshToken,
} from '../../lib/auth/jwt-token';
import { AppErrorCodes } from '../../types/error-codes';
import { TotpService } from '../../totp/totp.service';
import { ConcurrentRequestInterceptor } from '../../interceptors/concurrent-request.interceptor';

type VerifyMfaDto = {
  mfaToken?: string;
  code?: string;
};

@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly totp: TotpService,
  ) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  async setup(@AuthUser() user: PublicUser, @Res() res: Response) {
    try {
      const rawSecret = this.totp.generateSecret();

      const issuerId = process.env.TOTP_ISSUER!;

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
    } catch (error) {
      if (error && error.code) throw error;
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  @Get('backup-codes')
  @UseGuards(JwtAuthGuard)
  async getBackupCodes(@AuthUser() user: PublicUser, @Res() res: Response) {
    try {
      if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
      const result = await this.mfaService.regenerateBackupCodesForUser(
        user.id,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Backup codes regenerated',
        backup_codes: result.backupCodes,
      });
    } catch (error) {
      if (error && error.code) throw error;
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async disableMfa(@AuthUser() user: PublicUser, @Res() res: Response) {
    try {
      if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
      await this.mfaService.disableMfaForUser(user.id);
      return res.status(HttpStatus.OK).json({ message: 'MFA disabled' });
    } catch (error) {
      if (error && error.code) throw error;
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  @Post('verify')
  async verify(
    @Body() body: VerifyMfaDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { mfaToken, code } = body || {};
      if (!mfaToken || !code) {
        throw AppErrorCodes.INVALID_REQUEST;
      }

      const verifyResult = await verifyJWTToken(mfaToken);
      if (!verifyResult.success || !verifyResult.payload) {
        throw AppErrorCodes.INVALID_TOKEN;
      }

      const userId = verifyResult.payload.sub;
      const jwtStateId = verifyResult.payload.id;

      if (!userId) throw AppErrorCodes.INVALID_TOKEN;

      if (!this.mfaService) throw AppErrorCodes.MFA_NOT_ENABLED;
      if (!this.authService) throw AppErrorCodes.INTERNAL_SERVER_ERROR;

      await this.mfaService.verifyToken(userId, code);

      const sessionData = await this.authService.createSession(userId);

      const tokenResult = await generateJWTToken({
        userId,
        expirationHours: 1,
        jwtStateId,
      });
      if (!tokenResult.success || !tokenResult.token) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      const refreshResult = await generateRefreshToken(userId, {
        jwtStateId: tokenResult.jwtId,
      });
      if (!refreshResult.success || !refreshResult.token) {
        throw AppErrorCodes.TOKEN_GENERATION_FAILED;
      }

      res.status(HttpStatus.OK).json({
        message: 'MFA verification successful',
        jwtId: tokenResult.jwtId,
        access_token: tokenResult.token,
        token_type: 'Bearer',
        expires_in: 60 * 60,
        refresh_token: refreshResult.token,
        refresh_expires_in: 60 * 60 * 24 * 30,
        session_id: sessionData.sessionId,
        profile: tokenResult.profile,
      });
    } catch (error) {
      if (error && error.code) {
        throw error;
      }
      throw AppErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }
}
