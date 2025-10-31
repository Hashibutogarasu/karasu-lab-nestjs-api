import { Body, Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { SessionService } from '../data-base/query/session/session.service';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';
import {
  SessionsDeleteRequestDto,
  SessionsFindAllResponseDto,
} from '../data-base/query/session/session.dto';
import { NoInterceptor } from '../interceptors/no-interceptor.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@NoInterceptor()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) { }

  @ApiOkResponse({
    type: SessionsFindAllResponseDto,
  })
  @Get()
  async getSessions(@AuthUser() user: PublicUser) {
    return {
      sessions: await this.sessionService.findAll({
        userId: user.id,
      })
    };
  }

  @ApiOkResponse({
    type: SessionsDeleteRequestDto,
  })
  @Delete()
  async deleteSession(
    @AuthUser() user: PublicUser,
    @Body() body: SessionsDeleteRequestDto,
  ) {
    return await this.sessionService.delete(body.id, user.id);
  }
}
