import { createParamDecorator, ExecutionContext, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export const File = (field = 'file') => {
  const paramDecorator = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const file = req?.file;
    if (!file) return undefined;
    return file.buffer ?? file;
  })();

  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    UseInterceptors(FileInterceptor(field))(target, propertyKey, descriptor as any);
    paramDecorator(target, propertyKey, parameterIndex);
  };
};
