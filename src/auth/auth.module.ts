import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';
import { EncryptionModule } from '../encryption/encryption.module';
import { MfaModule } from '../mfa/mfa.module';
import { GoogleOAuthProvider } from '../lib/auth/google-oauth.provider';
import { DiscordOAuthProvider } from '../lib/auth/discord-oauth.provider';
import { XOAuthProvider } from '../lib/auth/x-oauth.provider';
import { OAuthProviderFactory } from '../lib/auth/oauth-provider.factory';
import { MfaController } from './mfa/mfa.controller';
import { TotpService } from '../totp/totp.service';

@Module({
  imports: [
    EncryptionModule.forRoot({
      privateKey: process.env.ENCRYPTION_PRIVATE_KEY!,
      publicKey: process.env.ENCRYPTION_PUBLIC_KEY!,
    }),
    MfaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ExternalProviderAccessTokenService,
    GoogleOAuthProvider,
    DiscordOAuthProvider,
    XOAuthProvider,
    OAuthProviderFactory,
    TotpService,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, OAuthProviderFactory],
})
export class AuthModule {}
