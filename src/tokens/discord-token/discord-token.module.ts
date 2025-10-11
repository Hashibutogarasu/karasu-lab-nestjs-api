import { Module, DynamicModule } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { DiscordTokenService } from './discord-token.service';
import { AuthModule } from '../../auth/auth.module';

export const DISCORD_TOKEN_OPTIONS = 'DISCORD_TOKEN_OPTIONS';

export interface DiscordTokenModuleOptions {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

@Module({
  imports: [AuthModule],
  providers: [AuthService, DiscordTokenService],
  exports: [DiscordTokenService],
})
export class DiscordTokenModule {
  /**
   * Configure module with Discord OAuth client credentials.
   * If not provided, the service will fall back to environment variables.
   */
  static forRoot(options: DiscordTokenModuleOptions): DynamicModule {
    return {
      module: DiscordTokenModule,
      providers: [
        { provide: DISCORD_TOKEN_OPTIONS, useValue: options },
        AuthService,
        DiscordTokenService,
      ],
      exports: [DiscordTokenService],
    };
  }
}
