import { Module, DynamicModule } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { DiscordTokenService } from './discord-token.service';
import { WorkflowService } from '../../auth/sns/workflow/workflow.service';
import { ManagerService } from '../../auth/session/manager/manager.service';
import { DateTimeService } from '../../date-time/date-time.service';

@Module({
  providers: [
    AuthService,
    DiscordTokenService,
    WorkflowService,
    ManagerService,
    DateTimeService,
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
      providers: [AuthService, DiscordTokenService, DateTimeService],
      exports: [DiscordTokenService],
    };
  }
}
