import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthDiscordUser } from '../auth/decorators/auth-discord-user.decorator';
import { AuthGoogleUser } from '../auth/decorators/auth-google-user.decorator';
import { DiscordUser } from '../types/discord-user';
import { GoogleUser } from '../types/google-user';
import { Permission } from '../auth/decorators/permission.decorator';
import { PermissionType } from '../types/permission';
import { UserService } from '../data-base/query/user/user.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiWrappedOkResponse } from '../decorators/api-wrapped-ok-response/api-wrapped-ok-response.decorator';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';
import { GetRolesResponseDto } from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @ApiWrappedOkResponse({
    type: PublicUser,
  })
  @ApiBearerAuth()
  @Get('me')
  async getMe(@AuthUser() user: PublicUser): Promise<PublicUser> {
    return user;
  }

  @ApiWrappedOkResponse({
    type: GetRolesResponseDto,
  })
  @ApiBearerAuth()
  @Get('me/roles')
  async getMyRoles(@AuthUser() user: PublicUser): Promise<GetRolesResponseDto> {
    const roles = await this.userService.getUserRoles(user.id);
    return { roles };
  }

  /**
   * GET /users/me/discord
   * Discord プロフィール情報を取得
   * JWT認証が必要で、かつDiscordプロフィールが存在する必要がある
   */
  @ApiWrappedOkResponse({
    type: DiscordUser,
  })
  @ApiBearerAuth()
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
  @ApiWrappedOkResponse({
    type: GoogleUser,
  })
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  @Permission([PermissionType.VIEW_ALL_USERS])
  @Get('list')
  async findAllUsers() {
    return this.userService.findAll();
  }
}
