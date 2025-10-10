import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthDiscordUser } from '../auth/decorators/auth-discord-user.decorator';
import type { DiscordUser } from '../types/discord-user';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me/discord
   * Discord プロフィール情報を取得
   * JWT認証が必要で、かつDiscordプロフィールが存在する必要がある
   */
  @Get('me/discord')
  async getDiscordMe(
    @AuthDiscordUser() discordUser: DiscordUser,
  ): Promise<DiscordUser> {
    return discordUser;
  }
}
