import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OauthModule } from './oauth/oauth.module';
import { DeveloperModule } from './developer/developer.module';
import { AccountModule } from './account/account.module';
import { ResendService } from './resend/resend.service';
import { DiscordAppModule } from './discord-app/discord-app.module';

@Module({
  imports: [
    AuthModule,
    OauthModule,
    DeveloperModule,
    AccountModule,
    DiscordAppModule,
  ],
  controllers: [AppController],
  providers: [AppService, ResendService],
})
export class AppModule {}
