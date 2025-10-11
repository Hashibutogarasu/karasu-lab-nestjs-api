import { Module } from '@nestjs/common';
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
import { EncryptionService } from './encryption/encryption.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    OauthModule,
    DeveloperModule,
    AccountModule,
    DiscordAppModule,
    MarkdownModule,
    McpServerModule,
    DifyModule,
    JwtStateModule,
    UsersModule,
    GmoModule,
  ],
  controllers: [AppController],
  providers: [AppService, ResendService, EncryptionService],
})
export class AppModule {}
