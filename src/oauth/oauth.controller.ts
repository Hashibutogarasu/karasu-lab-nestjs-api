import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { AppErrorCodes } from '../types/error-codes';
import {
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
} from './oauth.dto';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { OauthService } from './oauth.service';
import { ZodValidationPipe } from 'nestjs-zod';

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
  @Post('token')
  async token(@Body() body: OAuthTokenBodyDto): Promise<OAuthTokenResponseDto> {
    return this.oauthService.token(body);
  }

  @ApiBody({
    type: OAuthTokenRevokeDto,
  })
  @Post('token/revoke')
  async revoke(@Body() body: OAuthTokenRevokeDto): Promise<void> {
    return this.oauthService.revoke(body);
  }
}
