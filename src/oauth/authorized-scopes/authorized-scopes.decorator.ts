import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtTokenService } from '../../auth/jwt-token/jwt-token.service';
import { OauthGrantedTokenService } from '../../data-base/query/oauth-granted-token/oauth-granted-token.service';
import { PermissionService } from '../../permission/permission.service';

/**
 * パラメータデコレーター: @AuthorizedScopes() scopes: string[]
 * 実行時に Authorization ヘッダのトークンを検証し、付与済みスコープの配列を返します。
 * 動作:
 *  - JWT 検証結果に `scope` / `scopes` があればそれを返す
 *  - jti があれば OauthGrantedTokenService.findByJti から permissionBitMask を読み取り PermissionService.bitmaskToScopes で復元して返す
 */
export const AuthorizedScopes = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<string[]> => {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth || typeof auth !== 'string') return [];
    const [, token] = auth.split(' ');
    if (!token) return [];

    // get ModuleRef set by setAuthUserModuleRef in bootstrap/tests
    const mr: any = (global as any).__authModuleRef;
    if (!mr) return [];

    const jwtSvc: JwtTokenService | undefined = mr.get(JwtTokenService, {
      strict: false,
    });
    const grantedSvc: OauthGrantedTokenService | undefined = mr.get(
      OauthGrantedTokenService,
      { strict: false },
    );
    const permSvc: PermissionService | undefined = mr.get(PermissionService, {
      strict: false,
    });

    if (!jwtSvc) return [];

    const result = await jwtSvc.verifyJWTToken(token);
    if (!result.success || !result.payload) return [];

    const payloadAny: any = result.payload as any;
    if (payloadAny.scope && typeof payloadAny.scope === 'string') {
      return payloadAny.scope.split(' ').filter(Boolean);
    }
    if (Array.isArray(payloadAny.scopes)) return payloadAny.scopes;

    const jti = payloadAny.jti || payloadAny.id;
    if (jti && grantedSvc && permSvc) {
      try {
        const granted = await grantedSvc.findByJti(jti);
        if (!granted) return [];
        const mask = Number(granted.permissionBitMask ?? 0);
        const permScopes = permSvc.bitmaskToScopes(mask);
        const extra = (granted as any).scopes ?? [];
        return Array.from(new Set([...permScopes, ...extra]));
      } catch (e) {
        return [];
      }
    }

    return [];
  },
);
