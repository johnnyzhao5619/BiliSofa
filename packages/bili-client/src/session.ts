import { DomainError, type Scope } from '../../contracts/src/index.ts';

export class SessionManager {
  private generation = 0;
  private accountId = 'guest';
  private controllers = new Map<string, AbortController>();
  private sequence = 0;
  switchAccount(accountId: string): void {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(accountId)) throw new DomainError('invalid');
    this.invalidate();
    this.accountId = accountId;
  }
  invalidate(): void {
    this.generation++;
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }
  begin(mediaSessionId = 'none'): { scope: Scope; signal: AbortSignal; finish: () => void } {
    if (this.controllers.size >= 32) throw new DomainError('invalid');
    const requestId = `r${++this.sequence}`;
    const controller = new AbortController();
    this.controllers.set(requestId, controller);
    return {
      scope: { accountId: this.accountId, generation: this.generation, mediaSessionId, requestId },
      signal: controller.signal,
      finish: () => this.controllers.delete(requestId),
    };
  }
  accepts(scope: Scope): boolean {
    return scope.accountId === this.accountId && scope.generation === this.generation && this.controllers.has(scope.requestId);
  }
  async read<T>(load: (scope: Scope, signal: AbortSignal) => Promise<unknown>, parse: (value: unknown) => T): Promise<T> {
    const task = this.begin();
    try {
      const value = await load(task.scope, task.signal);
      if (!this.accepts(task.scope)) throw new DomainError('cancelled');
      return parse(value);
    } finally { task.finish(); }
  }
  dispose(): void { this.invalidate(); }
}
