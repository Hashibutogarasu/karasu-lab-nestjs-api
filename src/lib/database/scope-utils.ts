/**
 * スコープが許可されているかチェック
 */
export function isValidScope(
  requestedScope: string,
  allowedScope: string,
): boolean {
  if (!requestedScope) return true;
  if (!allowedScope) return false;

  const requestedScopes = requestedScope.split(' ');
  const allowedScopes = allowedScope.split(' ');

  return requestedScopes.every((scope) => allowedScopes.includes(scope));
}

/**
 * スコープをマージ
 */
export function mergeScopes(
  scope1?: string,
  scope2?: string,
): string | undefined {
  if (!scope1 && !scope2) return undefined;
  if (!scope1) return scope2;
  if (!scope2) return scope1;

  const scopes1 = scope1.split(' ');
  const scopes2 = scope2.split(' ');
  const mergedScopes = [...new Set([...scopes1, ...scopes2])];

  return mergedScopes.join(' ');
}
