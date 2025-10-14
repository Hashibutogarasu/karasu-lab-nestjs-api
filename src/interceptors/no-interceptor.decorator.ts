import { SetMetadata } from '@nestjs/common';

export const NO_INTERCEPTOR_KEY = 'no-interceptor';

export const NoInterceptor = () => SetMetadata(NO_INTERCEPTOR_KEY, true);
