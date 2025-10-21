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
import { UpdateJwtStateDto } from '../data-base/query/jwtstate/jwt-state.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import * as client from '@prisma/client';
import { JwtstateService } from '../data-base/query/jwtstate/jwtstate.service';
import { IsAdmin } from '../auth/decorators/is-admin.decorator';

@UseGuards(JwtAuthGuard)
@Controller('jwt-state')
export class JwtStateController {
  constructor(private readonly jwtStateService: JwtstateService) {}

  @Post('create')
  createJWT(@AuthUser() user: client.User) {
    return this.jwtStateService.createJWT({
      userId: user.id,
    });
  }

  @Get()
  findAll(@AuthUser() user: client.User) {
    return this.jwtStateService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthUser() user: client.User) {
    return this.jwtStateService.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateJwtStateDto: UpdateJwtStateDto,
    @AuthUser() user: client.User,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.jwtStateService.update(id, updateJwtStateDto, user, isAdmin);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @AuthUser() user: client.User,
    @IsAdmin() isAdmin: boolean,
  ) {
    return this.jwtStateService.remove(id, user, isAdmin);
  }
}
