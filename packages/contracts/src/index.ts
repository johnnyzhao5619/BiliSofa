import { serviceString } from './service-configuration.ts';
import { MAX_MEDIA_SECONDS } from './media-limits.ts';
export type Evidence = 'source' | 'desktop' | 'emulator' | 'device';
export type Verdict = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNVERIFIED';
export interface Scope {
  accountId: string;
  generation: number;
  mediaSessionId: string;
  requestId: string;
}
export type ErrorCode = 'invalid' | 'cancelled' | 'timeout' | 'network' | 'login' | 'permission' | 'unsupported' | 'unknown';
export class DomainError extends Error {
  constructor(public readonly code: ErrorCode, public readonly retryable = false) {
    super(code);
    this.name = 'DomainError';
  }
}
export interface ProbeRequest {
  version: 1;
  scope: Scope;
  operation: 'wasm' | 'native' | 'http' | 'mpd';
  report?: string;
}
export interface ProbeResult {
  version: 1;
  scope: Scope;
  operation: ProbeRequest['operation'];
  verdict: Verdict;
  code: string;
  phase?: 'progress' | 'final';
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('invalid');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 128): string {
  if (typeof value !== 'string' || !value.length || value.length > max || /[\u0000-\u001f]/.test(value)) {
    throw new DomainError('invalid');
  }
  return value;
}
/** ADR-111: rows a list parser skipped; absent when none. Kept plus skipped never exceeds the source rows. */
export function skippedCount(value: unknown, rows: number, kept: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || kept + value > rows) throw new DomainError('invalid');
  return value;
}
export function finite(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new DomainError('invalid');
  return value;
}
export function parseScope(value: unknown): Scope {
  const s = record(value);
  const generation = finite(s.generation, 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(generation)) throw new DomainError('invalid');
  return { accountId: text(s.accountId), generation, mediaSessionId: text(s.mediaSessionId), requestId: text(s.requestId) };
}
/** ADR-108: one 20-row public batch crosses the kernel Worker boundary under its own larger bound. */
export const BATCH_ROWS = 20, BATCH_MESSAGE_BYTES = 32768;
export function boundedMessage(value: unknown, limit = 4096): Record<string, unknown> {
  let encoded: string;
  try { encoded = JSON.stringify(value); } catch { throw new DomainError('invalid'); }
  if (!encoded || new TextEncoder().encode(encoded).length > limit) throw new DomainError('invalid');
  return record(value);
}
export function parseProbeRequest(value: unknown): ProbeRequest {
  const v = boundedMessage(value);
  if (v.version !== 1 || !['wasm', 'native', 'http', 'mpd'].includes(String(v.operation))) throw new DomainError('invalid');
  if (Object.keys(v).some(k => !['version', 'scope', 'operation', ...(v.operation === 'http' ? ['report'] : [])].includes(k))) throw new DomainError('invalid');
  return { version: 1, scope: parseScope(v.scope), operation: v.operation as ProbeRequest['operation'], ...(v.operation === 'http' ? { report: parseDiagnosticReport(v.report) } : {}) };
}
export function parseProbeResult(value: unknown): ProbeResult {
  const v = boundedMessage(value);
  if (v.version !== 1 || !['wasm', 'native', 'http', 'mpd'].includes(String(v.operation))) throw new DomainError('invalid');
  if (Object.keys(v).some(k => !['version', 'scope', 'operation', 'verdict', 'code', 'phase'].includes(k))) throw new DomainError('invalid');
  const request = { version: 1 as const, scope: parseScope(v.scope), operation: v.operation as ProbeRequest['operation'] };
  if (!['PASS', 'FAIL', 'BLOCKED', 'UNVERIFIED'].includes(String(v.verdict))) throw new DomainError('invalid');
  const code = text(v.code, 96);
  if (!/^[a-z0-9_.-]+$/.test(code)) throw new DomainError('invalid');
  if (v.phase !== undefined && v.phase !== 'progress' && v.phase !== 'final') throw new DomainError('invalid');
  if (v.phase === 'progress' && v.verdict !== 'UNVERIFIED') throw new DomainError('invalid');
  return { ...request, verdict: v.verdict as Verdict, code, ...(v.phase ? { phase: v.phase } : {}) };
}
export interface MediaSource { url: string; kind: 'vod' | 'live'; }
export type PlayerState = 'idle' | 'preparing' | 'ready' | 'playing' | 'paused' | 'error';
export interface PlayerBackend {
  /** ADR-110: true only for a backend that honours `startMs` in prepare; others are prepared at 0 and then seek. */
  readonly startsAt?: boolean;
  /** `startMs` (ADR-110): prepare at a resume position instead of preparing at 0 and seeking (only when `startsAt`). */
  prepare(source: MediaSource, onTime: (timeMs: number) => void, onEnd: () => void, onError: () => void, startMs?: number): Promise<void>;
  play(): void;
  pause(): void;
  // A failed seek is retryable only after a finished SDK operation and known
  // unchanged active state; timeout/unknown state requires owner cleanup.
  seek(timeMs: number): Promise<void>;
  /** Acknowledges a real backend command, never a measured effective rate. */
  setRate?(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed';
  close(): void;
  screensaver(active: boolean): void;
}
export interface NetworkRequest { scope: Scope; url: string; method: 'GET' | 'POST'; signal: AbortSignal; }
export interface NetworkRuntime { request(request: NetworkRequest): Promise<unknown>; dispose(): void; }
// Private sessions never share the preference store interface. No insecure default implementation.
export interface PrivateSessionStore {
  read(accountId: string): Promise<Uint8Array | undefined>;
  write(accountId: string, bytes: Uint8Array): Promise<void>;
  remove(accountId: string): Promise<void>;
}

// W01 LAN report: a fixed diagnostic schema, never account data, addresses or IME text.
export function parseDiagnosticReport(value: unknown): string {
  const raw = text(value, 3072);
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const v = record(decoded);
  if (Object.keys(v).some(k => !['schema', 'build', 'environment', 'marker', 'entries'].includes(k)) || v.schema !== 1) throw new DomainError('invalid');
  const build = text(v.build, 64);
  if (!/^[a-f0-9]{64}$/.test(build)) throw new DomainError('invalid');
  const environment = record(v.environment);
  const keys = ['environment', 'model', 'firmware', 'platform', 'webEngine', 'avplay', 'mse', 'wasm'];
  for (const [key, item] of Object.entries(environment)) {
    const safe = text(item, 160);
    if (!keys.includes(key) || !/^[A-Za-z0-9_. -]+$/.test(safe) || /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/.test(safe)) throw new DomainError('invalid');
  }
  const marker = finite(v.marker, 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(marker) || !Array.isArray(v.entries) || v.entries.length > 8) throw new DomainError('invalid');
  const entries = v.entries.map(item => {
    const entry = record(item);
    if (Object.keys(entry).some(k => !['caseId', 'verdict', 'code', 'kind'].includes(k))) throw new DomainError('invalid');
    const caseId = text(entry.caseId, 64), code = text(entry.code, 96);
    if (!/^W01-[A-Za-z0-9_-]+$/.test(caseId) || !/^[a-z0-9_.-]+$/.test(code) || !['PASS', 'FAIL', 'BLOCKED', 'UNVERIFIED'].includes(String(entry.verdict))) throw new DomainError('invalid');
    if (entry.kind !== undefined && !['capability', 'progress', 'metadata'].includes(String(entry.kind))) throw new DomainError('invalid');
    return { caseId, verdict: entry.verdict, code, ...(entry.kind ? { kind: entry.kind } : {}) };
  });
  const result = JSON.stringify({ schema: 1, build, environment, marker, entries });
  if (result.length > 3072) throw new DomainError('invalid');
  return result;
}

export interface ProbeStop { version: 1; scope: Scope; operation: ProbeRequest['operation']; control: 'stop'; }
export function parseProbeStop(value: unknown): ProbeStop {
  const v = boundedMessage(value);
  if (v.version !== 1 || v.control !== 'stop' || !['http', 'mpd'].includes(String(v.operation)) || Object.keys(v).some(key => !['version', 'scope', 'operation', 'control'].includes(key))) throw new DomainError('invalid');
  return { version: 1, scope: parseScope(v.scope), operation: v.operation as ProbeStop['operation'], control: 'stop' };
}

// F03 local word suggestions. No account/network command or text evaluation.
export interface InitialQuery { version: 1; scope: Scope; initials: string; }
export interface InitialResult { version: 1; scope: Scope; words: string[]; error?: 'asset_unavailable'; }
export function parseInitialQuery(value: unknown): InitialQuery {
  const v = boundedMessage(value);
  if (v.version !== 1 || Object.keys(v).some(k => !['version', 'scope', 'initials'].includes(k)) || typeof v.initials !== 'string' || !/^[a-z0-9]{0,24}$/.test(v.initials)) throw new DomainError('invalid');
  return { version: 1, scope: parseScope(v.scope), initials: v.initials };
}
export function parseInitialResult(value: unknown): InitialResult {
  const v = boundedMessage(value);
  if (v.version !== 1 || Object.keys(v).some(k => !['version', 'scope', 'words', 'error'].includes(k)) || !Array.isArray(v.words) || v.words.length > 64 || v.words.some(word => typeof word !== 'string' || !/^[\u3400-\u9fff\uf900-\ufaff\u3007]{1,4}$/.test(word))) throw new DomainError('invalid');
  if (v.error !== undefined && (v.error !== 'asset_unavailable' || v.words.length !== 0)) throw new DomainError('invalid');
  return { version: 1, scope: parseScope(v.scope), words: v.words as string[], ...(v.error ? { error: 'asset_unavailable' as const } : {}) };
}

// W01/W03 guest popular read candidate. No caller URL, cookie, header or account data.
export interface CoverReference { host: string; path: string; }
export function parseCoverReference(value: unknown): CoverReference {
  const v = record(value);
  if (Object.keys(v).length !== 2 || ![serviceString('a_d1d8109613cd'),serviceString('a_d1460da3012e'),serviceString('a_b97db64c383a')].includes(String(v.host)) || typeof v.path !== 'string' || v.path.length > 1024 || !/^\/bfs\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(v.path)) throw new DomainError('invalid');
  return {host:v.host as CoverReference['host'],path:v.path};
}
export interface PopularCard { bvid: string; title: string; owner: string; durationSec: number; views: number; cover?: CoverReference; }
export interface PopularRequest { version: 1; scope: Scope; operation: 'guest-popular'; page: number; }
export interface PopularResult {
  version: 1; scope: Scope; operation: 'guest-popular'; closed: true;
  kind: 'ok' | 'http_error' | 'api_error' | 'invalid_response' | 'transport_error' | 'cancelled';
  status: number; apiCode?: number; code: string; items: PopularCard[]; noMore: boolean; skipped?: number;
}
export function popularScope(value: unknown): Scope {
  const raw = record(value), scope = parseScope(value);
  if (Object.keys(raw).length !== 4 || Object.keys(raw).some(k => !['accountId', 'generation', 'mediaSessionId', 'requestId'].includes(k)) || scope.accountId !== 'guest' || ![scope.mediaSessionId, scope.requestId].every(id => /^[A-Za-z0-9_-]{1,64}$/.test(id))) throw new DomainError('invalid');
  return scope;
}
export function parsePopularRequest(value: unknown): PopularRequest {
  const v = boundedMessage(value), page = finite(v.page, 1, 25);
  if (v.version !== 1 || v.operation !== 'guest-popular' || !Number.isInteger(page) || Object.keys(v).some(k => !['version', 'scope', 'operation', 'page'].includes(k))) throw new DomainError('invalid');
  return { version: 1, scope: popularScope(v.scope), operation: 'guest-popular', page };
}
export function parsePopularCard(item: unknown): PopularCard {
  const card = record(item), bvid = text(card.bvid, 12), title = text(card.title, 120), owner = text(card.owner, 48), durationSec = finite(card.durationSec, 0, MAX_MEDIA_SECONDS), views = finite(card.views, 0, Number.MAX_SAFE_INTEGER);
  if (Object.keys(card).length !== (card.cover===undefined?5:6) || Object.keys(card).some(k => !['bvid', 'title', 'owner', 'durationSec', 'views','cover'].includes(k)) || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || !Number.isInteger(durationSec) || !Number.isInteger(views)) throw new DomainError('invalid');
  return { bvid, title, owner, durationSec, views,...(card.cover===undefined?{}:{cover:parseCoverReference(card.cover)}) };
}
/** `rows` is 4 for a screen page, or BATCH_ROWS for one kernel batch (ADR-108). */
export function parsePopularResult(value: unknown, rows: 4 | typeof BATCH_ROWS = 4): PopularResult {
  const v = boundedMessage(value, rows === 4 ? 4096 : BATCH_MESSAGE_BYTES), status = finite(v.status, 0, 599);
  if (v.version !== 1 || v.operation !== 'guest-popular' || v.closed !== true || !Number.isInteger(status) || (status !== 0 && status < 100) || !['ok', 'http_error', 'api_error', 'invalid_response', 'transport_error', 'cancelled'].includes(String(v.kind)) || Object.keys(v).some(k => !['version', 'scope', 'operation', 'closed', 'kind', 'status', 'apiCode', 'code', 'items', 'noMore', 'skipped'].includes(k))) throw new DomainError('invalid');
  if (!Array.isArray(v.items) || v.items.length > rows || typeof v.noMore !== 'boolean' || (v.kind !== 'ok' && v.items.length)) throw new DomainError('invalid');
  const items = v.items.map(parsePopularCard);
  if (new Set(items.map(item => item.bvid)).size !== items.length) throw new DomainError('invalid');
  const skipped = skippedCount(v.skipped, rows, items.length);
  if (skipped !== undefined && v.kind !== 'ok') throw new DomainError('invalid');
  const code = text(v.code, 96);
  if (!/^guest\.[a-z0-9_]+$/.test(code)) throw new DomainError('invalid');
  const apiCode = v.apiCode === undefined ? undefined : finite(v.apiCode, -2147483648, 2147483647);
  if (apiCode !== undefined && !Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (v.kind === 'ok' && (status !== 200 || apiCode !== 0)) throw new DomainError('invalid');
  if (v.kind !== 'ok' && v.noMore !== true) throw new DomainError('invalid');
  if (v.kind === 'ok' && code !== 'guest.popular_ok') throw new DomainError('invalid');
  if (v.kind === 'http_error' && (status === 0 || status === 200 || apiCode !== undefined || code !== `guest.http_${status}`)) throw new DomainError('invalid');
  if (v.kind === 'api_error' && (status !== 200 || apiCode === undefined || apiCode === 0 || code !== 'guest.api_error')) throw new DomainError('invalid');
  if (v.kind === 'invalid_response' && (apiCode !== undefined || code !== 'guest.invalid_response')) throw new DomainError('invalid');
  if (v.kind === 'transport_error' && (apiCode !== undefined || !/^guest\.(transport_[0-9]{1,3}|native_unavailable)$/.test(code))) throw new DomainError('invalid');
  if (v.kind === 'cancelled' && (status !== 0 || apiCode !== undefined || code !== 'guest.cancelled')) throw new DomainError('invalid');
  return { version: 1, scope: popularScope(v.scope), operation: 'guest-popular', closed: true, kind: v.kind as PopularResult['kind'], status, ...(apiCode === undefined ? {} : { apiCode }), code, items, noMore: v.noMore, ...(skipped === undefined ? {} : { skipped }) };
}
