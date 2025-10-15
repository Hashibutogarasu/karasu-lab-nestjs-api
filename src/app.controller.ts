import { Controller, Get } from '@nestjs/common';
import { NoInterceptor } from './interceptors/no-interceptor.decorator';
import { AppService } from './app.service';
import { Permission } from './auth/decorators/permission.decorator';
import { PermissionType } from './types/permission';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getVersion() {
    return this.appService.getVersion();
  }

  @Get('ping')
  getPing() {
    return { ping: true };
  }

  @NoInterceptor()
  @Get('raw-ping')
  getRawPing() {
    return { ping: true };
  }

  @Permission([PermissionType.USER_READ])
  @Get('user-read')
  userRead() {
    return { userRead: true };
  }

  @Permission([PermissionType.ADMIN_READ])
  @Get('admin-read')
  adminRead() {
    return { adminRead: true };
  }
}
