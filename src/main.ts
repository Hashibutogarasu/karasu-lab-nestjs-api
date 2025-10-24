/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppErrorCodeFilter } from './filters/app-error-code.filter';
import { ResponseFormatterInterceptor } from './interceptors/response-formatter.interceptor';
import { Reflector } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AppErrorCodeFilter());

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseFormatterInterceptor(reflector));
  app.useGlobalPipes(new ZodValidationPipe());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Karasu LAB API')
    .addServer(process.env.BASE_URL!)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
