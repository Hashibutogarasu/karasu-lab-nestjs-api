import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionBitcalcService } from '../../permission-bitcalc/permission-bitcalc.service';
import { PERMISSION_METAKEY } from '../decorators/permission.decorator';
import { AppErrorCodes } from '../../types/error-codes';
import { findUserById } from '../../lib/database/query';
import { PermissionType } from '../../types/permission';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly bitcalc: PermissionBitcalcService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<PermissionType[] | undefined>(
      PERMISSION_METAKEY,
      context.getHandler(),
    );

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const id = (req.user! as any).id;

    const user = await findUserById(id);

    if (!user) {
      throw AppErrorCodes.UNAUTHORIZED;
    }

    const userMasks = user.roles.map((role) => role.bitmask);

    // ユーザーがロールを持っていない場合、権限なしとする
    if (userMasks.length === 0) {
      throw AppErrorCodes.FORBIDDEN;
    }

    const requiredMask = this.bitcalc.encode(required);

    // まず、各ロール個別に必要権限を満たすものがないかチェック
    for (const mask of userMasks) {
      if ((mask & requiredMask) === requiredMask) {
        return true;
      }
    }

    // 次に、全ロールを OR 結合して必要権限を満たすかをチェック
    const combinedUserMask = userMasks.reduce((acc, mask) => acc | mask, 0);

    if ((combinedUserMask & requiredMask) === requiredMask) {
      return true;
    }

    throw AppErrorCodes.FORBIDDEN;
  }
}
