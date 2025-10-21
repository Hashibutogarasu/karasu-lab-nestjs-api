import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';
import { UserService } from '../../data-base/query/user/user.service';

export function getGlobalModule(
  metaData: ModuleMetadata,
): TestingModuleBuilder {
  const autoProviders = [UserService];

  const incomingImports = Array.isArray(metaData.imports)
    ? (metaData.imports as unknown[])
    : [];

  const incomingProviders = Array.isArray(metaData.providers)
    ? (metaData.providers as unknown[])
    : [];

  // Merge autoProviders and incomingProviders, but avoid duplicates
  const mergedProviders = [
    ...incomingProviders,
    ...autoProviders.filter(
      (auto) =>
        !incomingProviders.some((p) => {
          if (!p) return false;
          if (typeof p === 'object' && (p as any).provide) {
            return (p as any).provide === auto;
          }
          return p === auto;
        }),
    ),
  ];

  const mergedMeta: ModuleMetadata = {
    ...metaData,
    imports: incomingImports as any,
    providers: mergedProviders as any,
  };

  return Test.createTestingModule(mergedMeta as any);
}
