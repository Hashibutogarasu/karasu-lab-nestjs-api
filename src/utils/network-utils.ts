import { ZodError, ZodType } from 'zod';
import { AppErrorCode, AppErrorCodes } from '../types/error-codes';

export type Validator<T> = ZodType<T> | ((data: any) => T);

/**
 * 汎用的な fetch ヘルパー
 * - response.ok をチェックして共通エラーを投げる
 * - JSON をパースして返す
 * - オプションで Zod スキーマまたは変換関数で検証/変換を行う
 * - タイムアウトを指定可能
 *
 * @example
 * const payload = await fetchJson<MyType>(url, { method: 'GET' }, { validate: MyZodSchema });
 */
export async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  options?: {
    validate?: Validator<T>;
    okStatuses?: number[];
    timeoutMs?: number;
  },
): Promise<T> {
  const { validate, okStatuses, timeoutMs } = options || {};

  const controller = new AbortController();
  const signal = controller.signal;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      timeout = setTimeout(() => controller.abort(), timeoutMs);
    }

    const response = await fetch(input, {
      ...(init || {}),
      signal,
    } as RequestInit);

    // レスポンスが期待ステータスかチェック
    if (Array.isArray(okStatuses) && okStatuses.length > 0) {
      if (!okStatuses.includes(response.status)) {
        throw AppErrorCodes.EXTERNAL_API_REQUEST_FAILED;
      }
    } else if (!response.ok) {
      throw AppErrorCodes.EXTERNAL_API_REQUEST_FAILED;
    }

    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      // JSON パースに失敗
      throw AppErrorCodes.EXTERNAL_API_REQUEST_FAILED;
    }

    if (validate) {
      try {
        // Zod スキーマかどうかをチェック
        const maybeZod = validate as ZodType<T>;
        if (typeof maybeZod.parse === 'function') {
          return maybeZod.parse(body);
        }

        // 単なる変換/検証関数として扱う
        const fn = validate as (d: any) => T;
        return fn(body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw AppErrorCodes.INVALID_FORMAT;
        }
        throw AppErrorCodes.EXTERNAL_API_REQUEST_FAILED;
      }
    }

    return body as T;
  } catch (err: unknown) {
    // fetch が AbortError を投げした場合などもここに来る
    if (err instanceof Error && err.name === 'AbortError') {
      throw AppErrorCodes.CONNECTION_ERROR;
    }

    // AppErrorCode のインスタンスならそのまま再送出
    if (err instanceof AppErrorCode) {
      throw err;
    }

    throw AppErrorCodes.EXTERNAL_API_REQUEST_FAILED;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export default fetchJson;
