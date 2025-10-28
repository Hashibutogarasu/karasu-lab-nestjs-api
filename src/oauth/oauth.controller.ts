import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UseGuards,
  UsePipes,
  Redirect,
  Put,
  Delete,
} from '@nestjs/common';
import { AppErrorCodes } from '../types/error-codes';
import {
  CreateOAuthClientDto,
  CreateOAuthClientResponseDto,
  DeleteOAuthClientDto,
  GetAvailableScopesRequestDto,
  OAuthAuthorizeQuery,
  OAuthTokenBodyDto,
  OAuthTokenResponseDto,
  OAuthTokenRevokeDto,
  OpenIdConnectUserProfile,
  RegenerateOAuthClientDto,
  UpdateOAuthClientDto,
} from './oauth.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiFoundResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiPermanentRedirectResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { OauthService } from './oauth.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';
import { BasicOAuthGuard } from './basic/basic.guard';
import BasicAuthOauthClient from './basic-auth-oauth-client/basic-auth-oauth-client.decorator';
import type { OAuthClient } from '@prisma/client';
import { AuthorizedScopes } from './authorized-scopes/authorized-scopes.decorator';

@Controller('oauth')
@UsePipes(ZodValidationPipe)
export class OauthController {
  constructor(private readonly oauthService: OauthService) { }

  @ApiBadRequestResponse(AppErrorCodes.INVALID_REDIRECT_URI.apiResponse)
  @ApiInternalServerErrorResponse(
    AppErrorCodes.INTERNAL_SERVER_ERROR.apiResponse,
  )
  @ApiPermanentRedirectResponse(AppErrorCodes.INVALID_SCOPE.apiResponse)
  @ApiPermanentRedirectResponse(
    AppErrorCodes.UNSUPPORTED_RESPONSE_TYPE.apiResponse,
  )
  @ApiPermanentRedirectResponse(AppErrorCodes.ACCESS_DENIED.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.UNAUTHORIZED.apiResponse)
  @ApiPermanentRedirectResponse(AppErrorCodes.INVALID_PARAMETERS.apiResponse)
  @ApiFoundResponse({ description: 'Redirect to the provided redirect_uri' })
  @ApiQuery({
    type: OAuthAuthorizeQuery,
  })
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  @Redirect()
  async authorize(
    @Query() params: OAuthAuthorizeQuery,
    @AuthUser() user: PublicUser,
  ) {
    const redirect = await this.oauthService.authorize(params, user);
    return { url: redirect };
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
  @ApiConsumes('application/x-www-form-urlencoded')
  @UseGuards(BasicOAuthGuard)
  @Post('token')
  async token(
    @Body() body: OAuthTokenBodyDto,
    @BasicAuthOauthClient() client: OAuthClient,
  ): Promise<OAuthTokenResponseDto> {
    switch (body.grant_type) {
      case 'authorization_code':
        return this.oauthService.token(body, client);
      case 'refresh_token':
        return this.oauthService.refreshToken(body, client);
      default:
        throw AppErrorCodes.UNSUPPORTED_TOKEN_TYPE;
    }
  }

  @ApiBadRequestResponse(AppErrorCodes.INVALID_REQUEST.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.INVALID_CLIENT.apiResponse)
  @ApiBadRequestResponse(AppErrorCodes.UNSUPPORTED_TOKEN_TYPE.apiResponse)
  @ApiBody({
    type: OAuthTokenRevokeDto,
  })
  @ApiBearerAuth()
  @ApiConsumes('application/x-www-form-urlencoded')
  @UseGuards(JwtAuthGuard)
  @Post('token/revoke')
  async revoke(
    @Body() body: OAuthTokenRevokeDto,
    @AuthUser() user: PublicUser,
  ): Promise<void> {
    return this.oauthService.revoke(body, user);
  }

  @Get('userinfo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Authenticated user information' })
  async userinfo(
    @AuthUser() user: PublicUser,
    @AuthorizedScopes() scopes: string[],
  ): Promise<Partial<OpenIdConnectUserProfile>> {
    const out: Partial<OpenIdConnectUserProfile> = { sub: user.id };

    if (scopes.includes('profile') || scopes.includes('openid')) {
      out.name = user.username;
      out.preferred_username = user.username;
    }

    if (scopes.includes('email')) {
      out.email = user.email;
      out.email_verified = !!user.email;
    }

    if (scopes.includes('address')) {
      out.address = undefined;
    }
    if (scopes.includes('phone')) {
      out.phone_number = undefined;
      out.phone_number_verified = undefined;
    }

    return out;
  }

  @Post('availlable-scopes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List of available OAuth scopes' })
  async availableScopes(
    @AuthUser() user: PublicUser,
    @Body() body: GetAvailableScopesRequestDto,
  ): Promise<any> {
    return this.oauthService.getAvailableScopes(body, user);
  }

  @Post('client')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createClient(
    @AuthUser() user: PublicUser,
    @Body() body: CreateOAuthClientDto,
  ): Promise<CreateOAuthClientResponseDto> {
    return this.oauthService.createClient(body, user);
  }

  @Post('client/regenerate-secret')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async regenerateClientSecret(@AuthUser() user: PublicUser, @Body() body: RegenerateOAuthClientDto) {
    return this.oauthService.regenerateClientSecret(body, user);
  }

  @Put('client')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateClient(
    @AuthUser() user: PublicUser,
    @Body() body: UpdateOAuthClientDto,
  ) {
    return this.oauthService.updateClient(body, user);
  }

  @Delete('client')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteClient(
    @AuthUser() user: PublicUser,
    @Body() body: DeleteOAuthClientDto,
  ) {
    return this.oauthService.deleteClient(body, user);
  }
}
