import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AppErrorCodes } from '../types/error-codes';
import {
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
} from './oauth.dto';
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OauthService } from './oauth.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';

@Controller('oauth')
@UsePipes(ZodValidationPipe)
export class OauthController {
  constructor(private readonly oauthService: OauthService) { }

  @ApiQuery({
    type: OAuthAuthorizeQuery,
  })
  @Get('authorize')
  async authorize(@Query() params: OAuthAuthorizeQuery) {
    return this.oauthService.authorize(params);
  }

  @ApiBody({
    type: OAuthTokenBodyDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('token')
  async token(@Body() body: OAuthTokenBodyDto, @AuthUser() user: PublicUser): Promise<OAuthTokenResponseDto> {
    return this.oauthService.token(body, user);
  }

  @ApiBody({
    type: OAuthTokenRevokeDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('token/revoke')
  async revoke(@Body() body: OAuthTokenRevokeDto, @AuthUser() user: PublicUser): Promise<void> {
    return this.oauthService.revoke(body, user);
  }
}
