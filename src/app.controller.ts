import { Controller, Get } from '@nestjs/common';
import { NoInterceptor } from './interceptors/no-interceptor.decorator';
import { AppService } from './app.service';
import { Permission } from './auth/decorators/permission.decorator';
import { PermissionType } from './types/permission';
import { AppErrorCodes } from './types/error-codes';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

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

  @Get('yosi')
  getYosi() {
    return { message: 'app.yosi.response', foo: 'bar' };
  }

  @Get('internal-server-error')
  getInternalError() {
    throw AppErrorCodes.INTERNAL_SERVER_ERROR;
  }
}
