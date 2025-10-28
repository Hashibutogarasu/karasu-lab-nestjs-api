import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EncryptionModule } from '../encryption/encryption.module';
import { MfaModule } from '../mfa/mfa.module';
import { JwtStateModule } from '../jwt-state/jwt-state.module';
import { DataBaseModule } from '../data-base/data-base.module';
import { GoogleOAuthProvider } from '../lib/auth/google-oauth.provider';
import { DiscordOAuthProvider } from '../lib/auth/discord-oauth.provider';
import { XOAuthProvider } from '../lib/auth/x-oauth.provider';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import { MfaController } from './mfa/mfa.controller';
import { TotpService } from '../totp/totp.service';
import { WorkflowService } from './sns/workflow/workflow.service';
import { JwtTokenService } from './jwt-token/jwt-token.service';
import { AuthCoreService } from './sns/auth-core/auth-core.service';
import { SnsAuthCallback } from '../lib/auth/sns-auth';
import { DateTimeService } from '../date-time/date-time.service';

@Module({
  imports: [
    EncryptionModule.forRoot({
      privateKey: process.env.ENCRYPTION_PRIVATE_KEY!,
      publicKey: process.env.ENCRYPTION_PUBLIC_KEY!,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '24h' },
    }),
    MfaModule,
    forwardRef(() => JwtStateModule),
    forwardRef(() => DataBaseModule),
    PassportModule,
  ],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    GoogleOAuthProvider,
    DiscordOAuthProvider,
    XOAuthProvider,
    OAuthProviderFactory,
    TotpService,
    WorkflowService,
    JwtTokenService,
    AuthCoreService,
    SnsAuthCallback,
    DateTimeService,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    OAuthProviderFactory,
    JwtTokenService,
    SnsAuthCallback,
  ],
})
export class AuthModule {}
