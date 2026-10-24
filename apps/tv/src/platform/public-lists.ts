import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { ContentApiError } from '../../../../packages/contracts/src/content.ts';
/** ADR-105 request hygiene for the two risk-controlled public lists (category rankings, UP uploads).
 * Process-local: a result is reused for 10 minutes; a risk-control refusal starts a 60 s pause in which
 * nothing is requested; the last outcome is kept for 帮助与诊断 as fixed words and integers only. */
const TTL_MS = 600000, PAUSE_MS = 60000;
/** B站 risk control answers these lanes with API -352/-412/-509/-799 or HTTP 412. */
export const LIMITED_API_CODES = new Set([-352, -412, -509, -799]);
export class PublicLimitedError extends Error {
  constructor(readonly retryInMs: number, readonly apiCode?: number, readonly http?: number) { super('limited'); }
}
export type PublicLane = 'account' | 'guest';
let pausedUntil = 0, last: { lane: PublicLane; list: 'category' | 'up'; ok: boolean; apiCode?: number; http?: number } | undefined;
const cache = new Map<string, { at: number; value: unknown }>();
/** A refusal from either lane, as the error the pages show; other failures pass through unchanged. */
export function limitedFrom(error: unknown): PublicLimitedError | undefined {
  if (error instanceof PublicLimitedError) return error;
  if (error instanceof ContentApiError && LIMITED_API_CODES.has(error.apiCode)) return new PublicLimitedError(PAUSE_MS, error.apiCode);
  return undefined;
}
export async function pacedRead<T>(key: string, lane: PublicLane, list: 'category' | 'up', read: () => Promise<T>, now = Date.now): Promise<T> {
  const hit = cache.get(`${lane}:${key}`);
  if (hit && now() - hit.at < TTL_MS) return hit.value as T;
  if (pausedUntil > now()) throw new PublicLimitedError(pausedUntil - now(), last?.apiCode, last?.http);
  try {
    const value = await read();
    cache.set(`${lane}:${key}`, { at: now(), value }); if (cache.size > 64) cache.delete(cache.keys().next().value!);
    last = { lane, list, ok: true }; return value;
  } catch (error) {
    const limited = limitedFrom(error);
    if (limited) { pausedUntil = now() + PAUSE_MS; last = { lane, list, ok: false, ...(limited.apiCode === undefined ? {} : { apiCode: limited.apiCode }), ...(limited.http === undefined ? {} : { http: limited.http }) }; throw new PublicLimitedError(PAUSE_MS, limited.apiCode, limited.http); }
    if (!(error instanceof DomainError && error.code === 'cancelled')) last = { lane, list, ok: false };
    throw error;
  }
}
/** Seconds left in the pause, for “约 N 秒后可重试”. */
export const pauseSeconds = (error: PublicLimitedError) => Math.max(1, Math.ceil(error.retryInMs / 1000));
export function limitedText(error: PublicLimitedError): string {
  const code = error.apiCode !== undefined ? `风控 ${error.apiCode}` : error.http !== undefined ? `HTTP ${error.http}` : '风控';
  return `B站暂时限制了访问（${code}），约 ${pauseSeconds(error)} 秒后可重试`;
}
/** One line for 帮助与诊断. */
export function publicListNote(): string {
  if (!last) return '';
  const what = last.list === 'category' ? '分区' : 'UP投稿', how = last.lane === 'account' ? '账号会话' : '游客';
  const result = last.ok ? '成功' : last.apiCode !== undefined ? `B站返回 ${last.apiCode}` : last.http !== undefined ? `HTTP ${last.http}` : '读取失败';
  return `最近一次${what}读取：${how} · ${result}`;
}
/** Tests only: a fresh process. */
export function resetPublicLists(): void { pausedUntil = 0; last = undefined; cache.clear(); }
