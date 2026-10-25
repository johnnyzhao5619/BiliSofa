import { parseWbiKeys, type WbiKeys } from '../../../../packages/contracts/src/public-kernel.ts';
type StorageApi = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY = 'bilisofa.wbi-keys.v1', TTL_MS = 6 * 3600000;
const day = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
/** ADR-108: B站's public WBI signing salts (img/sub), published by the anonymous nav response.
 * They are not credentials, so they live in ordinary storage apart from sessions. They expire
 * after six hours or at the local date change, and a refused signature drops them at once. */
export class WbiKeyStore {
  private memory: string | undefined;
  constructor(private readonly storage: StorageApi | undefined, private readonly now = Date.now) {}
  get(): WbiKeys | undefined {
    let raw: string | null | undefined = this.memory;
    if (this.storage) { try { raw = this.storage.getItem(KEY) ?? this.memory; } catch { raw = this.memory; } }
    if (!raw) return undefined;
    try {
      const v = JSON.parse(raw) as Record<string, unknown>;
      if (!v || typeof v !== 'object' || Object.keys(v).length !== 4 || v.version !== 1 || !Number.isSafeInteger(v.at)) return undefined;
      const at = v.at as number, now = this.now();
      if (at > now || now - at >= TTL_MS || day(at) !== day(now)) return undefined;
      return parseWbiKeys({ img: v.img, sub: v.sub });
    } catch { return undefined; }
  }
  store(keys: WbiKeys): void {
    const parsed = parseWbiKeys(keys), raw = JSON.stringify({ version: 1, img: parsed.img, sub: parsed.sub, at: this.now() });
    this.memory = raw;
    if (this.storage) { try { this.storage.setItem(KEY, raw); } catch { /* This run still uses the memory copy. */ } }
  }
  invalidate(): void {
    this.memory = undefined;
    if (this.storage) { try { this.storage.removeItem(KEY); } catch { /* Memory is already cleared. */ } }
  }
}
let shared: WbiKeyStore | undefined;
export function wbiKeys(): WbiKeyStore {
  if (!shared) { let storage: StorageApi | undefined; try { storage = globalThis.localStorage; } catch { storage = undefined; } shared = new WbiKeyStore(storage); }
  return shared;
}
