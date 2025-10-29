import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE, ModuleRef } from '@nestjs/core';
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
import { ZodValidationPipe } from './zod-validation-type';
import { AppConfigModule } from './app-config/app-config.module';
import { GitHubModule } from './git-hub/git-hub.module';
import { PermissionModule } from './permission/permission.module';
import { DateTimeModule } from './date-time/date-time.module';
import { DateTimeService } from './date-time/date-time.service';
import { JwtStateCronService } from './data-base/query/jwtstate/jwt-state-cron.service';
import { I18nTranslateModule } from './i18n-translate/i18n-translate.module';
import { R2Module } from './cloudflare/r2/r2.module';
import { AppConfigService } from './app-config/app-config.service';
import { EncryptionService } from './encryption/encryption.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    OauthModule,
    AccountModule,
    ...(process.env.DISCORD_BOT_TOKEN
      ? [
          {
            global: true,
            module: DiscordAppModule,
          },
        ]
      : []),
    MarkdownModule,
    McpServerModule,
    DifyModule,
    JwtStateModule,
    EncryptionModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: async (appConfig: AppConfigService) => ({
        privateKey: appConfig.get('encryptionPrivateKey'),
        publicKey: appConfig.get('encryptionPublicKey'),
      }),
      inject: [AppConfigService],
      global: true,
    }),
    JwtModule.registerAsync({
      imports: [EncryptionModule],
      inject: [EncryptionService],
      useFactory: async (encryptionService: EncryptionService) => {
        let privateKeyPem: string | undefined;
        try {
          privateKeyPem = encryptionService.getPrivateKeyPem();
        } catch (_e) {
          if (process.env.ENCRYPTION_PRIVATE_KEY) {
            privateKeyPem = Buffer.from(
              process.env.ENCRYPTION_PRIVATE_KEY,
              'base64',
            ).toString('utf8');
          }
        }

        return {
          secret: privateKeyPem,
          signOptions: { expiresIn: '24h' },
          verifyOptions: { algorithms: ['RS256'] },
        };
      },
      global: true,
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
    AppConfigModule.forRoot(),
    GitHubModule,
    PermissionModule,
    {
      global: true,
      module: DateTimeModule,
    },
    {
      global: true,
      module: I18nTranslateModule,
    },
    R2Module,
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
    {
      provide: APP_PIPE,
      useValue: ZodValidationPipe,
    },
    MfaService,
    UserService,
    AuthorizationCodeService,
    AccessTokenService,
    RefreshTokenService,
    AuthStateService,
    ExtraProfileService,
    PendingEmailChangeProcessService,
    DateTimeService,
    JwtStateCronService,
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
