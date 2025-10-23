import { Module, DynamicModule } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { DiscordTokenService } from './discord-token.service';
import { WorkflowService } from '../../auth/sns/workflow/workflow.service';
import { ManagerService } from '../../auth/session/manager/manager.service';

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
  static forRoot(): DynamicModule {
    return {
      module: DiscordTokenModule,
      providers: [AuthService, DiscordTokenService],
      exports: [DiscordTokenService],
    };
  }
}
