import { DomainError, type Scope } from '../../contracts/src/index.ts';
export class SessionManager {
  private generation = 0;
  private accountId = 'guest';
  private controllers = new Map<string, { controller: AbortController; scope: Scope }>();
  private sequence = 0;
  private invalidating = false;
  private disposed = false;
  switchAccount(accountId: string): void {
    if (this.disposed || this.invalidating) throw new DomainError('cancelled');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(accountId)) throw new DomainError('invalid');
    this.invalidate(); this.accountId = accountId;
  }
  invalidate(): void {
    if (this.invalidating) return;
    this.generation++;
    const old = [...this.controllers.values()]; this.controllers.clear(); this.invalidating = true;
    try { for (const item of old) item.controller.abort(); } finally { this.invalidating = false; }
  }
  begin(mediaSessionId = 'none'): { scope: Scope; signal: AbortSignal; finish: () => void } {
    if (this.disposed || this.invalidating) throw new DomainError('cancelled');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(mediaSessionId) || this.controllers.size >= 32) throw new DomainError('invalid');
    const requestId = `r${++this.sequence}`, controller = new AbortController();
    const scope = Object.freeze({ accountId: this.accountId, generation: this.generation, mediaSessionId, requestId });
    this.controllers.set(requestId, { controller, scope });
    return { scope, signal: controller.signal, finish: () => { this.controllers.delete(requestId); } };
  }
  accepts(scope: Scope): boolean {
    const expected = this.controllers.get(scope.requestId)?.scope;
    return !this.disposed && !this.invalidating && !!expected && scope.accountId === this.accountId && scope.generation === this.generation && scope.mediaSessionId === expected.mediaSessionId && scope.accountId === expected.accountId && scope.generation === expected.generation;
  }
  async read<T>(load: (scope: Scope, signal: AbortSignal) => Promise<unknown>, parse: (value: unknown) => T): Promise<T> {
    const task = this.begin();
    try {
      const value = await load(task.scope, task.signal);
      if (!this.accepts(task.scope)) throw new DomainError('cancelled');
      const parsed = parse(value);
      if (!this.accepts(task.scope)) throw new DomainError('cancelled');
      return parsed;
    } catch (error) {
      if (!this.accepts(task.scope)) throw new DomainError('cancelled');
      throw error;
    } finally { task.finish(); }
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.invalidate(); }
}
