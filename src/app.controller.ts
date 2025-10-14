import { Controller, Get } from '@nestjs/common';
import { NoInterceptor } from './interceptors/no-interceptor.decorator';
import { AppService } from './app.service';

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
}
