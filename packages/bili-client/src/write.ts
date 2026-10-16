import { DomainError, text } from '../../contracts/src/index.ts';

export type WriteState = 'pending' | 'checking' | 'confirmed' | 'rejected' | 'unknown' | 'not-applied';
export interface WriteIntent { accountId: string; generation: number; action: string; targetId: string; }
export type WriteOutcome = 'confirmed' | 'rejected' | 'unknown';
function key(intent: WriteIntent): string {
  if (!Number.isSafeInteger(intent.generation) || intent.generation < 0) throw new DomainError('invalid');
  return JSON.stringify([text(intent.accountId), intent.generation, text(intent.action), text(intent.targetId)]);
}
// Entries are retained across account switches. Unknown outcomes block replay, including after switching back.
export class WriteCoordinator {
  private entries = new Map<string, WriteState>();
  constructor(snapshot: readonly { intent: WriteIntent; state: WriteState }[] = []) {
    if (snapshot.length > 256) throw new DomainError('invalid');
    for (const entry of snapshot) {
      key(entry.intent);
      if (!['pending', 'checking', 'confirmed', 'rejected', 'unknown', 'not-applied'].includes(entry.state)) throw new DomainError('invalid');
      this.entries.set(this.physicalKey(entry.intent), entry.state === 'pending' || entry.state === 'checking' ? 'unknown' : entry.state);
    }
  }
  snapshot(): { intent: WriteIntent; state: WriteState }[] {
    return [...this.entries].map(([id, state]) => {
      const [accountId, action, targetId] = JSON.parse(id) as [string, string, string];
      return { intent: { accountId, action, targetId, generation: 0 }, state };
    });
  }
  private physicalKey(intent: WriteIntent): string {
    return JSON.stringify([text(intent.accountId), text(intent.action), text(intent.targetId)]);
  }
  state(intent: WriteIntent): WriteState | undefined { key(intent); return this.entries.get(this.physicalKey(intent)); }
  async submit(intent: WriteIntent, send: () => Promise<WriteOutcome>, userConfirmed: boolean): Promise<WriteState> {
    key(intent);
    if (!userConfirmed) throw new DomainError('permission');
    const id = this.physicalKey(intent);
    const previous = this.entries.get(id);
    if (previous === 'pending' || previous === 'checking' || previous === 'unknown' || previous === 'confirmed') throw new DomainError('unknown');
    if (!this.entries.has(id) && this.entries.size >= 256) throw new DomainError('invalid');
    this.entries.set(id, 'pending');
    try {
      const result = await send();
      const state = ['confirmed', 'rejected', 'unknown'].includes(result) ? result : 'unknown';
      this.entries.set(id, state);
      return state;
    } catch {
      this.entries.set(id, 'unknown');
      return 'unknown';
    }
  }
  async reconcile(intent: WriteIntent, query: () => Promise<'applied' | 'not-applied' | 'unknown'>): Promise<WriteState> {
    key(intent);
    const id = this.physicalKey(intent);
    if (this.entries.get(id) !== 'unknown') throw new DomainError('invalid');
    this.entries.set(id, 'checking');
    let result: 'applied' | 'not-applied' | 'unknown' = 'unknown';
    try { result = await query(); } catch { /* Never infer absence from a failed read. */ }
    const state = result === 'applied' ? 'confirmed' : result === 'not-applied' ? 'not-applied' : 'unknown';
    this.entries.set(id, state);
    return state;
  }
  releaseConfirmed(intent: WriteIntent): void {
    key(intent);
    const id = this.physicalKey(intent);
    if (this.entries.get(id) !== 'confirmed' && this.entries.get(id) !== 'rejected') throw new DomainError('unknown');
    this.entries.delete(id);
  }
}
