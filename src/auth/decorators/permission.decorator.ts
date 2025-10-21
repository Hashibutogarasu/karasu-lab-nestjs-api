import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { PERMISSION_METAKEY } from '../permission.constants';

/**
 * Usage: @Permission([Permission.USER_READ, Permission.USER_WRITE])
 * This decorator will apply JwtAuthGuard and PermissionGuard and set metadata
 * indicating required permissions (as an array of Permission values).
 */
export function Permission(perms: number[]) {
  return applyDecorators(
    SetMetadata(PERMISSION_METAKEY, perms),
    UseGuards(JwtAuthGuard, PermissionGuard),
  );
}
