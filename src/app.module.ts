import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, ModuleRef } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OauthModule } from './oauth/oauth.module';
import { AccountModule } from './account/account.module';
import { ResendService } from './resend/resend.service';
import { DiscordAppModule } from './discord-app/discord-app.module';
import { MarkdownModule } from './markdown/markdown.module';
import { McpServerModule } from './mcp/mcp.module';
import { DifyModule } from './dify/dify.module';
import { JwtStateModule } from './jwt-state/jwt-state.module';
import { UsersModule } from './users/users.module';
import { GmoModule } from './gmo/gmo.module';
import { EncryptionModule } from './encryption/encryption.module';
import { DiscordTokenModule } from './tokens/discord-token/discord-token.module';
import { ResponseFormatterInterceptor } from './interceptors/response-formatter.interceptor';
import { LoggerMiddleware } from './logger-middleware/logger-middleware.middleware';
import { RoleModule } from './role/role.module';
import { PermissionBitcalcModule } from './permission-bitcalc/permission-bitcalc.module';
import { TotpModule } from './totp/totp.module';
import { MfaModule } from './mfa/mfa.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ConcurrentRequestInterceptor } from './interceptors/concurrent-request.interceptor';
import { DataBaseModule } from './data-base/data-base.module';
import { UserService } from './data-base/query/user/user.service';
import { AuthorizationCodeService } from './data-base/query/authorization-code/authorization-code.service';
import { AccessTokenService } from './data-base/query/access-token/access-token.service';
import { RefreshTokenService } from './data-base/query/refresh-token/refresh-token.service';
import { AuthStateService } from './data-base/query/auth-state/auth-state.service';
import { ExtraProfileService } from './data-base/query/extra-profile/extra-profile.service';
import { PendingEmailChangeProcessService } from './data-base/query/pending-email-change-process/pending-email-change-process.service';
import { MfaService } from './data-base/query/mfa/mfa.service';
import { setIsAdminModuleRef } from './auth/decorators/is-admin.decorator';
import { setAuthUserModuleRef } from './auth/decorators/auth-user.decorator';
import { setAuthGoogleProfileModuleRef } from './auth/decorators/auth-google-user.decorator';
import { setAuthDiscordProfileModuleRef } from './auth/decorators/auth-discord-user.decorator';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    OauthModule,
    AccountModule,
    ...(process.env.DISCORD_BOT_TOKEN ? [{
      global: true,
      module: DiscordAppModule,
    }] : []),
    MarkdownModule,
    McpServerModule,
    DifyModule,
    JwtStateModule,
    GmoModule,
    EncryptionModule.forRoot({
      privateKey: process.env.ENCRYPTION_PRIVATE_KEY!,
      publicKey: process.env.ENCRYPTION_PUBLIC_KEY!,
    }),
    DiscordTokenModule,
    RoleModule,
    PermissionBitcalcModule,
    TotpModule,
    MfaModule,
    process.env.REDIS_HOST
      ? CacheModule.register({
        store: async () =>
          await redisStore({
            socket: {
              host: process.env.REDIS_HOST!,
              port: process.env.REDIS_PORT!,
            },
            ttl: 10,
          }),
        isGlobal: true,
      })
      : CacheModule.register({ isGlobal: true, ttl: 10 }),
    {
      global: true,
      module: DataBaseModule,
    },
    {
      global: true,
      module: AuthModule,
    },
    {
      global: true,
      module: JwtModule,
    },
    {
      global: true,
      module: UsersModule,
    },
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResendService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormatterInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ConcurrentRequestInterceptor,
    },
    MfaService,
    UserService,
    AuthorizationCodeService,
    AccessTokenService,
    RefreshTokenService,
    AuthStateService,
    ExtraProfileService,
    PendingEmailChangeProcessService,
  ],
  exports: [AppService],
})
export class AppModule {
  constructor(private readonly moduleRef: ModuleRef) {
    setIsAdminModuleRef(this.moduleRef);
    setAuthUserModuleRef(this.moduleRef);
    setAuthGoogleProfileModuleRef(this.moduleRef);
    setAuthDiscordProfileModuleRef(this.moduleRef);
  }
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('');
  }
}
