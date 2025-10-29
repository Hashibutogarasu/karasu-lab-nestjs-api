import { Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { AccountPictureService } from './picture.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  AuthUser,
  PublicUser,
} from '../../auth/decorators/auth-user.decorator';
import { File } from '../../decorators/file/file.decorator';

@Controller('picture')
export class PictureController {
  constructor(private readonly accountPictureService: AccountPictureService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  async uploadProfilePicture(
    @AuthUser() user: PublicUser,
    @File() file: Buffer,
  ) {
    return this.accountPictureService.uploadProfilePicture(user.id, file);
  }

  @Delete('delete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteProfilePicture(@AuthUser() user: PublicUser) {
    return this.accountPictureService.deleteProfilePicture(user.id);
  }
}
