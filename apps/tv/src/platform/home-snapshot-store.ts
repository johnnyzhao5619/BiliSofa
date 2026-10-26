import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { HotSearchTerm } from '../../../../packages/contracts/src/hot-search.ts';
import { parseAccountId } from '../../../../packages/contracts/src/private-account.ts';
import { fresh, parseHomeSnapshot, SNAPSHOT_CARDS, SNAPSHOT_HOT, SNAPSHOT_MAX_CHARS, type HomeSnapshot, type SnapshotShelf } from '../../../../packages/contracts/src/home-snapshot.ts';
type StorageApi = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const PUBLIC = 'bilisofa.home-snapshot.v1', ACCOUNT = 'bilisofa.home-snapshot.v1.';
/** ADR-116: last home rows in ordinary local storage, apart from protected sessions and journals. Every failure
 * (no storage, quota, corrupt or old data) reads as "no snapshot"; the home then loads as it always did. */
export class HomeSnapshots {
  constructor(private readonly storage: StorageApi | undefined, private readonly now: () => number = Date.now) {}
  private key(shelf: SnapshotShelf, account?: string): string {
    if (shelf !== 'recommend') return PUBLIC;
    if (!account) throw new DomainError('invalid');
    return ACCOUNT + parseAccountId(account);
  }
  private load(key: string): HomeSnapshot {
    try { const raw = this.storage?.getItem(key); if (raw) return parseHomeSnapshot(raw, this.now()); } catch { /* absent */ }
    return { schema: 1, shelves: {} };
  }
  private save(key: string, doc: HomeSnapshot): void {
    try { const raw = JSON.stringify(doc); if (raw.length <= SNAPSHOT_MAX_CHARS) this.storage?.setItem(key, raw); } catch { /* best effort */ }
  }
  /** Cards no older than a day, or undefined. */
  read(shelf: SnapshotShelf, account?: string): { at: number; cards: PopularCard[] } | undefined {
    let item; try { item = this.load(this.key(shelf, account)).shelves[shelf]; } catch { return undefined; }
    return item && item.cards.length && fresh(item.at, this.now()) ? item : undefined;
  }
  write(shelf: SnapshotShelf, cards: readonly PopularCard[], account?: string): void {
    let key; try { key = this.key(shelf, account); } catch { return; }
    const doc = this.load(key); doc.shelves[shelf] = { at: this.now(), cards: cards.slice(0, SNAPSHOT_CARDS) }; this.save(key, doc);
  }
  readHot(): HotSearchTerm[] | undefined { const hot = this.load(PUBLIC).hot; return hot && hot.terms.length && fresh(hot.at, this.now()) ? hot.terms : undefined; }
  writeHot(terms: readonly HotSearchTerm[]): void { const doc = this.load(PUBLIC); doc.hot = { at: this.now(), terms: terms.slice(0, SNAPSHOT_HOT) }; this.save(PUBLIC, doc); }
  /** Removing an account or clearing its local data also forgets its 为你推荐. */
  clearAccount(account: string): void { try { this.storage?.removeItem(ACCOUNT + parseAccountId(account)); } catch { /* best effort */ } }
}
let shared: HomeSnapshots | undefined;
export function homeSnapshots(): HomeSnapshots {
  if (!shared) { let storage: StorageApi | undefined; try { storage = globalThis.localStorage; } catch { storage = undefined; } shared = new HomeSnapshots(storage); }
  return shared;
}
