import { DynamicModule, Global, Module } from '@nestjs/common';
import { DOMAIN_OPTIONS } from './domain.constants';
import { DomainService } from './domain.service';
import { DomainGuard } from './domain.guard';

export interface DomainModuleOptions {
  allowedDomains: string[];
}

@Global()
@Module({})
export class DomainModule {
  static forRoot(options: DomainModuleOptions): DynamicModule {
    return {
      module: DomainModule,
      providers: [
        {
          provide: DOMAIN_OPTIONS,
          useValue: options,
        },
        DomainService,
        DomainGuard,
      ],
      exports: [DomainService, DomainGuard],
    };
  }
}
