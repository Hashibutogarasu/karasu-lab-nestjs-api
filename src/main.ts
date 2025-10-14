/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppErrorCodeFilter } from './filters/app-error-code.filter';
import { ResponseFormatterInterceptor } from './interceptors/response-formatter.interceptor';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AppErrorCodeFilter());

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseFormatterInterceptor(reflector));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
