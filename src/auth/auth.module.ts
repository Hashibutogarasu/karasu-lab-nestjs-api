import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExternalProviderAccessTokenService } from '../encryption/external-provider-access-token/external-provider-access-token.service';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [
    EncryptionModule.forRoot({
      privateKey: process.env.ENCRYPTION_PRIVATE_KEY!,
      publicKey: process.env.ENCRYPTION_PUBLIC_KEY!,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ExternalProviderAccessTokenService,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
