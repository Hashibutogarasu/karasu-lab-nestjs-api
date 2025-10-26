import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AppErrorCodes } from '../types/error-codes';
import {
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
} from './oauth.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiPermanentRedirectResponse, ApiQuery } from '@nestjs/swagger';
import { OauthService } from './oauth.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';

@Controller('oauth')
@UsePipes(ZodValidationPipe)
export class OauthController {
  constructor(private readonly oauthService: OauthService) { }

  @ApiBadRequestResponse(AppErrorCodes.INVALID_REDIRECT_URI.apiResponse)
  @ApiInternalServerErrorResponse(AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.INVALID_SCOPE.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.UNSUPPORTED_RESPONSE_TYPE.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.ACCESS_DENIED.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.UNAUTHORIZED.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.INVALID_PARAMETERS.apiResponse)
  @ApiQuery({
    type: OAuthAuthorizeQuery,
  })
  @Get('authorize')
  async authorize(@Query() params: OAuthAuthorizeQuery) {
    return this.oauthService.authorize(params);
  }

  @ApiOkResponse({ type: OAuthTokenResponseDto })
  @ApiBadRequestResponse(AppErrorCodes.INVALID_CLIENT.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_GRANT.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_GRANT_TYPE.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.UNAUTHORIZED_CLIENT.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.UNAUTHORIZED.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_SCOPE.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_REQUEST.apiResponse)
  @ApiBody({
    type: OAuthTokenBodyDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('token')
  async token(@Body() body: OAuthTokenBodyDto, @AuthUser() user: PublicUser): Promise<OAuthTokenResponseDto> {
    return this.oauthService.token(body, user);
  }

  @ApiBadRequestResponse(AppErrorCodes.INVALID_REQUEST.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_CLIENT.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.UNSUPPORTED_TOKEN_TYPE.apiResponse)
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
