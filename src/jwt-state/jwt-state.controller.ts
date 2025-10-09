import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { JwtStateService } from './jwt-state.service';
import { UpdateJwtStateDto } from './dto/jwt-state.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import * as client from '@prisma/client';
import { IsAdmin } from '../auth/decorators/is-admin.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard)
@Controller('jwt-state')
export class JwtStateController {
  constructor(private readonly jwtStateService: JwtStateService) {}

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
