import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Post,
} from '@nestjs/common';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';
import * as client from '@prisma/client';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { IsAdmin } from '../auth/decorators/is-admin.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateJwtStateResponseDto, JwtStateDeleteDto, JwtStateFindAllResponseDto, JwtStateFindDto, UpdateJwtStateDto, UpdateJWTStateResponseDto } from './jwt-state.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiWrappedOkResponse } from '../decorators/api-wrapped-ok-response/api-wrapped-ok-response.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jwt-state')
export class JwtStateController {
  constructor(private readonly jwtStateService: JwtstateService) { }

  @ApiWrappedOkResponse({
    type: CreateJwtStateResponseDto,
  })
  @Post('create')
  createJWT(@AuthUser() user: PublicUser) {
    return this.jwtStateService.createJWT({
      userId: user.id,
    });
  }

  @ApiWrappedOkResponse({
    type: JwtStateFindAllResponseDto,
  })
  @Get()
  findAll(@AuthUser() user: PublicUser) {
    return this.jwtStateService.findAll(user);
  }

  @ApiWrappedOkResponse({
    type: JwtStateFindDto,
  })
  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() user: PublicUser) {
    return this.jwtStateService.findOne(id, user);
  }

  @ApiWrappedOkResponse({
    type: UpdateJWTStateResponseDto,
  })
  @ApiBody({ type: UpdateJwtStateDto })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateJwtStateDto: UpdateJwtStateDto,
    @AuthUser() user: PublicUser,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.jwtStateService.update(id, updateJwtStateDto, user, isAdmin);
  }

  @ApiBody({ type: JwtStateDeleteDto })
  @Delete(':id')
  remove(
    @Body() body: JwtStateDeleteDto,
    @AuthUser() user: client.User,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.jwtStateService.remove(body.id, user, isAdmin);
  }
}
