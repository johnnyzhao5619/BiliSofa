import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parseWriteJournal, type JournalStore, type WriteJournal } from '../../../../packages/contracts/src/retained-write.ts';
const KEY = 'bilisofa.retained-writes.v1';
/** No remove/clear operation: preference/account deletion cannot unlock writes. */
export class LocalWriteJournal implements JournalStore {
  constructor(private readonly storage: Pick<Storage,'getItem'|'setItem'> | undefined) {}
  read(): { raw: string | null; value: WriteJournal } {
    if (!this.storage) throw new DomainError('unsupported');
    let raw: string | null; try { raw = this.storage.getItem(KEY); } catch { throw new DomainError('unknown'); }
    return { raw, value: raw === null ? {schema:1,revision:0,entries:[]} : parseWriteJournal(raw) };
  }
  replace(expected: string | null, value: WriteJournal): string {
    const raw = JSON.stringify(value); parseWriteJournal(raw);
    try {
      if (!this.storage || this.storage.getItem(KEY) !== expected) throw new DomainError('unknown');
      this.storage.setItem(KEY,raw);
      if (this.storage.getItem(KEY) !== raw) throw new DomainError('unknown');
      return raw;
    } catch { throw new DomainError('unknown'); }
  }
}
export function writeJournal(): JournalStore {
  try { return new LocalWriteJournal(globalThis.localStorage); } catch { return new LocalWriteJournal(undefined); }
}
