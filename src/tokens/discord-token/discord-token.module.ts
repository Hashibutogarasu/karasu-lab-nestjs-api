import { Module, DynamicModule } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { DiscordTokenService } from './discord-token.service';
import { AuthModule } from '../../auth/auth.module';
import { DataBaseModule } from '../../data-base/data-base.module';
import { WorkflowService } from '../../auth/sns/workflow/workflow.service';
import { ManagerService } from '../../auth/session/manager/manager.service';
import { DISCORD_TOKEN_OPTIONS } from './discord-token.constants';

export interface DiscordTokenModuleOptions {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

@Module({
  imports: [],
  providers: [
    AuthService,
    DiscordTokenService,
    WorkflowService,
    ManagerService,
  ],
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
