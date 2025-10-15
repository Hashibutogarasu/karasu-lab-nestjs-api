import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OauthModule } from './oauth/oauth.module';
import { DeveloperModule } from './developer/developer.module';
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
import { UsersService } from './users/users.service';
import { PermissionBitcalcService } from './permission-bitcalc/permission-bitcalc.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    OauthModule,
    DeveloperModule,
    AccountModule,
    ...(process.env.DISCORD_TOKEN ? [DiscordAppModule] : []),
    MarkdownModule,
    McpServerModule,
    DifyModule,
    JwtStateModule,
    {
      global: true,
      module: UsersModule,
    },
    GmoModule,
    EncryptionModule.forRoot({
      privateKey: process.env.ENCRYPTION_PRIVATE_KEY!,
      publicKey: process.env.ENCRYPTION_PUBLIC_KEY!,
    }),
    DiscordTokenModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResendService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormatterInterceptor,
    },
    PermissionBitcalcService,
  ],
  exports: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('');
  }
}
