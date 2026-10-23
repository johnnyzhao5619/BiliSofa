import { DomainError } from '../../contracts/src/index.ts';
import type { LoginDisplay, LoginExchange } from '../../contracts/src/identity.ts';
import { ACCOUNT_LIMIT, parseAccountId, parsePrivateAccount, summarizeAccount, type AccountRepository, type AccountSummary } from '../../contracts/src/private-account.ts';
/** One explicit QR attempt; private bytes go directly from exchange to repository. */
export class LoginCoordinator {
  private current: { controller: AbortController; exchange: LoginExchange } | undefined;
  private poisoned = false;
  private epoch = 0;
  private closing: Promise<{ closed: boolean }> = Promise.resolve({ closed: true });
  constructor(private readonly repository: AccountRepository, private readonly create: () => LoginExchange) {}
  async login(signal: AbortSignal, display: (event: LoginDisplay) => void, renewId?: string): Promise<AccountSummary> {
    if(renewId!==undefined){parseAccountId(renewId);if(!this.repository.renew)throw new DomainError('unsupported');}
    const epoch = this.epoch;
    if (this.current || this.poisoned) throw new DomainError('unknown');
    if (signal.aborted) throw new DomainError('cancelled');
    if (!(await this.closing).closed || this.current || this.poisoned) throw new DomainError('unknown');
    if (epoch !== this.epoch) throw new DomainError('cancelled');
    if (renewId===undefined && (await this.repository.list()).length >= ACCOUNT_LIMIT) throw new DomainError('permission');
    if (signal.aborted || epoch !== this.epoch) throw new DomainError('cancelled');
    if (this.current || this.poisoned) throw new DomainError('unknown');
    const controller = new AbortController(), exchange = this.create(), owner = { controller, exchange };
    const cancel = () => { controller.abort(); void this.close(); };
    this.current = owner; signal.addEventListener('abort', cancel, { once: true });
    let saving = false;
    try {
      const value = parsePrivateAccount(await exchange.login(controller.signal, event => { if (this.current === owner && !controller.signal.aborted) display(event); }));
      if (this.current !== owner || controller.signal.aborted || signal.aborted) throw new DomainError('cancelled');
      // Exchange returns credentials only after native cleanup. This local save
      // still has its own cancellation/unknown outcome in the protected store.
      if(renewId!==undefined&&value.id!==renewId)throw new DomainError('permission');
      saving = true;
      if(renewId!==undefined)await this.repository.renew!(renewId,value,controller.signal);
      else await this.repository.add(value, controller.signal);
      saving = false;
      if (this.current !== owner || controller.signal.aborted || signal.aborted) throw new DomainError('cancelled');
      return summarizeAccount(value);
    } catch (e) {
      const code = e instanceof DomainError ? e.code : 'unknown';
      // A cancelled/unknown protected save may still complete in the SDK.
      // Do not claim that the whole login owner is closed just because its
      // network exchange already emitted a native close acknowledgement.
      if (saving && (code === 'cancelled' || code === 'unknown')) this.poisoned = true;
      throw new DomainError(code);
    }
    finally {
      signal.removeEventListener('abort', cancel);
      const closed = this.current === owner ? await this.close() : await this.closing;
      if (!closed.closed) throw new DomainError('unknown');
    }
  }
  close(): Promise<{ closed: boolean }> {
    this.epoch++;
    const current = this.current;
    if (!current) return this.poisoned ? this.closing.then(() => ({ closed: false })) : this.closing;
    this.current = undefined;
    const previous = this.closing;
    // Publish closure before synchronous abort listeners may reenter close.
    this.closing = Promise.resolve().then(async () => {
      let okay = false; try { okay = (await current.exchange.close()).closed === true; } catch { /* No raw transport errors. */ }
      this.poisoned ||= !okay; return { closed: (await previous).closed && okay && !this.poisoned };
    });
    current.controller.abort(); return this.closing;
  }
}
