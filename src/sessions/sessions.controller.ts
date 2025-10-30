import { Body, Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { SessionService } from '../data-base/query/session/session.service';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, PublicUser } from '../auth/decorators/auth-user.decorator';
import { ApiWrappedOkResponse } from '../decorators/api-wrapped-ok-response/api-wrapped-ok-response.decorator';
import { SessionsDeleteRequestDto, SessionsFindAllResponseDto } from '../data-base/query/session/session.dto';
import { AuthSession, PublicSession } from '../auth/decorators/auth-session.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) { }

  @ApiWrappedOkResponse({
    type: SessionsFindAllResponseDto,
  })
  @Get()
  async getSessions(@AuthSession() session: PublicSession) {
    return await this.sessionService.findAll({
      userId: session.userId,
    });
  }

  @ApiBody({
    type: SessionsDeleteRequestDto,
  })
  @Delete()
  async deleteSession(@AuthUser() user: PublicUser, @Body() body: SessionsDeleteRequestDto) {
    return await this.sessionService.delete(body.id, user.id);
  }
}
