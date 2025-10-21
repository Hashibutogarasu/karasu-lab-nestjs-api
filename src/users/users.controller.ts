import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthDiscordUser } from '../auth/decorators/auth-discord-user.decorator';
import { AuthGoogleUser } from '../auth/decorators/auth-google-user.decorator';
import type { DiscordUser } from '../types/discord-user';
import type { GoogleUser } from '../types/google-user';
import { Permission } from '../auth/decorators/permission.decorator';
import { PermissionType } from '../types/permission';
import { UserService } from '../data-base/query/user/user.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

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

  /**
   * GET /users/me/google
   * Google プロフィール情報を取得
   * JWT認証が必要で、かつGoogleプロフィールが存在する必要がある
   */
  @Get('me/google')
  async getGoogleMe(
    @AuthGoogleUser() googleUser: GoogleUser,
  ): Promise<GoogleUser> {
    return googleUser;
  }

  /**
   * GET /users/list
   * `VIEW_ALL_USERS`権限を持つユーザーのみがアクセス可能
   * 全てのユーザーの一覧を取得
   */
  @Permission([PermissionType.VIEW_ALL_USERS])
  @Get('list')
  async findAllUsers() {
    return this.userService.findAll();
  }
}
