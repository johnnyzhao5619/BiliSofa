import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { parseVisitorId, visitorArgument, type VisitorId } from '../../../../packages/contracts/src/visitor.ts';
import { KernelVisitor } from './public-lanes.ts';
type StorageApi = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY = 'bilisofa.visitor.v1', TTL_MS = 30 * 86400000, RETRY_MS = 600000;
/** ADR-106: B站's own anonymous visitor identity (buvid3/buvid4 plus the second it was obtained), kept on this TV only
 * in ordinary storage apart from sessions, reused for 30 days and clearable in 设置 → 本机数据. Obtained only when an
 * anonymous category/UP read needs it; a failure leaves the read anonymous as before and is not retried for 10 minutes. */
export class VisitorIds {
  private memory: string | undefined;
  private pending: Promise<string | undefined> | undefined;
  private failedAt = -Infinity;
  constructor(private readonly storage: StorageApi | undefined, private readonly obtain: (scope: Scope, signal: AbortSignal) => Promise<VisitorId | undefined>, private readonly now = Date.now) {}
  /** The saved identity as the native argument, or nothing when absent, expired or unreadable. */
  stored(): string | undefined {
    let raw: string | null | undefined = this.memory;
    if (this.storage) { try { raw = this.storage.getItem(KEY); } catch { raw = this.memory; } }
    if (!raw) return undefined;
    try {
      const v = JSON.parse(raw) as Record<string, unknown>;
      if (!v || typeof v !== 'object' || Object.keys(v).length !== 4 || v.version !== 1 || !Number.isSafeInteger(v.at)) return undefined;
      const at = v.at as number, id = parseVisitorId({ b3: v.b3, b4: v.b4 });
      if (at < 1e12 || at > this.now() + 86400000 || this.now() - at >= TTL_MS) return undefined;
      return visitorArgument(`${id.b3}|${id.b4}|${Math.floor(at / 1000)}`);
    } catch { return undefined; }
  }
  async ensure(scope: Scope, signal: AbortSignal): Promise<string | undefined> {
    const saved = this.stored();
    if (saved || this.now() - this.failedAt < RETRY_MS) return saved;
    this.pending ??= (async () => {
      try {
        const id = await this.obtain(scope, signal);
        if (!id) { this.failedAt = this.now(); return undefined; }
        const raw = JSON.stringify({ version: 1, b3: id.b3, b4: id.b4, at: this.now() });
        this.memory = raw;
        if (this.storage) { try { this.storage.setItem(KEY, raw); } catch { /* This run still uses it. */ } }
        return this.stored();
      } catch (error) {
        if (!(error instanceof DomainError && error.code === 'cancelled')) this.failedAt = this.now();
        return undefined;
      } finally { this.pending = undefined; }
    })();
    return this.pending;
  }
  saved(): boolean { return this.stored() !== undefined; }
  clear(): 'deleted' | 'unconfirmed' | 'unavailable' {
    this.memory = undefined; this.failedAt = -Infinity;
    if (!this.storage) return 'unavailable';
    try { this.storage.removeItem(KEY); return this.storage.getItem(KEY) === null ? 'deleted' : 'unconfirmed'; } catch { return 'unconfirmed'; }
  }
}
async function obtainVisitor(scope: Scope, signal: AbortSignal): Promise<VisitorId | undefined> {
  const worker = new KernelVisitor();
  try {
    const result = await worker.run({ version: 1, scope, operation: 'public-visitor' }, signal);
    if (result.kind === 'cancelled') throw new DomainError('cancelled');
    return result.kind === 'ok' ? result.visitorId : undefined;
  } finally { await worker.dispose().catch(() => {}); }
}
let shared: VisitorIds | undefined;
export function visitorIds(): VisitorIds {
  if (!shared) { let storage: StorageApi | undefined; try { storage = globalThis.localStorage; } catch { /* Memory only. */ } shared = new VisitorIds(storage, obtainVisitor); }
  return shared;
}
