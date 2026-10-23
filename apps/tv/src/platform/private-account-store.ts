import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { ACCOUNT_LIMIT, parseAccountId, parsePrivateAccount, summarizeAccount, type AccountRepository, type AccountSummary, type PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import type { KeyManagerDataApi } from './keymanager-data-api.ts';
import { keyManagerDataApi } from './samsung.ts';
// Fixed, application-owned slots. Never enumerate aliases, grant permissions,
// touch W01 aliases or fall back to ordinary browser storage.
const aliases = Array.from({ length: ACCOUNT_LIMIT }, (_, i) => ({ name: `bilisofa.session.v1.slot${i}` }));
const renewalAliases=aliases.map((_,i)=>[0,1].map(bank=>({name:`bilisofa.session.v2.slot${i}.bank${bank}`})));
const owners = new WeakMap<KeyManagerDataApi, { busy: boolean; uncertain: boolean }>();
const missing = (e: unknown) => !!e && typeof e === 'object' && 'name' in e && e.name === 'NotFoundError';
export class ProtectedAccountStore implements AccountRepository {
  private readonly owner: { busy: boolean; uncertain: boolean };
  constructor(private readonly api: KeyManagerDataApi | undefined, private readonly timeoutMs = 5000) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30000) throw new DomainError('invalid');
    this.owner = api ? owners.get(api) ?? { busy: false, uncertain: false } : { busy: false, uncertain: false };
    if (api) owners.set(api, this.owner);
  }
  private ready(): KeyManagerDataApi {
    if (!this.api) throw new DomainError('unsupported');
    if (this.owner.busy || this.owner.uncertain) throw new DomainError('unknown');
    return this.api;
  }
  private raw(api:KeyManagerDataApi,alias:{name:string}):string|undefined {
    let raw:unknown;try{raw=api.getData(alias);}catch(e){if(missing(e))return;throw new DomainError('unknown');}
    if(typeof raw!=='string'||raw.length>4608)throw new DomainError('invalid');return raw;
  }
  private entries(api:KeyManagerDataApi):{value?:PrivateAccount;revision:number;bank?:number}[] {
    const seen=new Set<string>();
    return aliases.map((alias,i)=>{
      const raw=this.raw(api,alias);let value:PrivateAccount|undefined,revision=0,bank:number|undefined;
      try{if(raw!==undefined)value=parsePrivateAccount(JSON.parse(raw));}catch{throw new DomainError('invalid');}
      for(const [index,key]of renewalAliases[i]!.entries()){
        const bytes=this.raw(api,key);if(bytes===undefined)continue;
        try{
          const envelope=JSON.parse(bytes);
          if(!envelope||Object.keys(envelope).length!==3||envelope.version!==1||!Number.isSafeInteger(envelope.revision)||envelope.revision<1)throw new DomainError('invalid');
          const account=parsePrivateAccount(envelope.account);
          if(value&&account.id!==value.id||envelope.revision===revision)throw new DomainError('invalid');
          if(envelope.revision>revision){value=account;revision=envelope.revision;bank=index;}
        }catch{throw new DomainError('invalid');}
      }
      if(value){if(seen.has(value.id))throw new DomainError('invalid');seen.add(value.id);}
      return {...(value?{value}:{}),revision,...(bank!==undefined?{bank}:{})};
    });
  }
  private slots(api:KeyManagerDataApi):(PrivateAccount|undefined)[]{return this.entries(api).map(entry=>entry.value);}
  async list(): Promise<AccountSummary[]> { return this.slots(this.ready()).flatMap(v => v ? [summarizeAccount(v)] : []); }
  async read(id: string): Promise<PrivateAccount | undefined> { parseAccountId(id); return this.slots(this.ready()).find(v => v?.id === id); }
  async remove(id: string): Promise<void> {
    parseAccountId(id); const api = this.ready(), slots = this.slots(api), i = slots.findIndex(v => v?.id === id);
    if (i < 0) return;
    // Remove all application-owned copies only on explicit account removal.
    for(const alias of [aliases[i]!,...renewalAliases[i]!]){
      try{api.removeData(alias);}catch(e){if(!missing(e)){this.owner.uncertain=true;throw new DomainError('unknown');}}
      try{api.getData(alias);}catch(e){if(missing(e))continue;}
      this.owner.uncertain=true;throw new DomainError('unknown');
    }
  }
  async renew(id:string,input:PrivateAccount,signal:AbortSignal):Promise<void>{
    parseAccountId(id);const value=parsePrivateAccount(input),api=this.ready();
    if(value.id!==id)throw new DomainError('permission');if(signal.aborted)throw new DomainError('cancelled');
    const entries=this.entries(api),i=entries.findIndex(e=>e.value?.id===id),entry=entries[i];
    if(!entry?.value)throw new DomainError('login');if(entry.revision>=Number.MAX_SAFE_INTEGER)throw new DomainError('invalid');
    const alias=renewalAliases[i]![entry.bank===0?1:0]!,raw=JSON.stringify({version:1,revision:entry.revision+1,account:value});
    if(raw.length>4608)throw new DomainError('invalid');
    // Only discard the inactive bank. The last confirmed session and all local
    // records survive interruption; never depend on saveData overwriting a key.
    try{api.removeData(alias);}catch(e){if(!missing(e))throw new DomainError('unknown');}
    if(this.raw(api,alias)!==undefined)throw new DomainError('unknown');
    if(signal.aborted)throw new DomainError('cancelled');this.owner.busy=true;
    return new Promise((resolve,reject)=>{
      let settled=false,completed=false;
      const finish=(code?:'unknown'|'cancelled')=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);if(code)reject(new DomainError(code));else resolve();};
      const cleanup=()=>{try{const actual=this.raw(api,alias);if(actual===undefined)return true;if(actual!==raw)return false;api.removeData(alias);return this.raw(api,alias)===undefined;}catch{return false;}};
      const cancel=()=>finish('cancelled'),timer=setTimeout(()=>finish('unknown'),this.timeoutMs);
      signal.addEventListener('abort',cancel,{once:true});
      const saved=()=>{if(completed)return;completed=true;let matches=false;try{matches=this.raw(api,alias)===raw;}catch{/* Fail closed. */}
        if(!settled&&!signal.aborted&&matches){this.owner.busy=false;finish();return;}
        if(cleanup())this.owner.busy=false;else this.owner.uncertain=true;finish('unknown');};
      const failed=()=>{if(completed)return;completed=true;if(cleanup())this.owner.busy=false;else this.owner.uncertain=true;finish('unknown');};
      try{api.saveData(alias.name,raw,null,saved,failed);}catch{failed();}
    });
  }
  async add(input: PrivateAccount, signal: AbortSignal): Promise<void> {
    const value = parsePrivateAccount(input), api = this.ready();
    if (signal.aborted) throw new DomainError('cancelled');
    const slots = this.slots(api);
    if (slots.some(v => v?.id === value.id)) throw new DomainError('permission');
    const i = slots.findIndex(v => !v); if (i < 0) throw new DomainError('permission');
    const alias = aliases[i]!, raw = JSON.stringify(value);
    if (raw.length > 4096) throw new DomainError('invalid');
    if (signal.aborted) throw new DomainError('cancelled');
    this.owner.busy = true;
    return new Promise((resolve, reject) => {
      let settled = false, completed = false;
      const finish = (code?: 'unknown' | 'cancelled') => {
        if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel);
        if (code) reject(new DomainError(code)); else resolve();
      };
      const cleanup = (): boolean => {
        let actual: unknown; try { actual = api.getData(alias); } catch (e) { return missing(e); }
        if (actual !== raw) return false;
        try { api.removeData(alias); } catch (e) { if (!missing(e)) return false; }
        try { api.getData(alias); } catch (e) { return missing(e); }
        return false;
      };
      // Unknown saves retain the shared lock until a real callback confirms
      // owned cleanup. A second store object cannot reuse the pending slot.
      const cancel = () => finish('cancelled');
      const timer = setTimeout(() => finish('unknown'), this.timeoutMs);
      signal.addEventListener('abort', cancel, { once: true });
      const saved = () => {
        if (completed) return; completed = true;
        let matches = false; try { matches = api.getData(alias) === raw; } catch { /* Confirm owned cleanup. */ }
        if (!settled && !signal.aborted && matches) { this.owner.busy = false; finish(); return; }
        if (cleanup()) this.owner.busy = false; else this.owner.uncertain = true;
        finish('unknown');
      };
      const failed = () => {
        if (completed) return; completed = true;
        if (cleanup()) this.owner.busy = false; else this.owner.uncertain = true;
        finish('unknown');
      };
      try { api.saveData(alias.name, raw, null, saved, failed); } catch { failed(); }
    });
  }
}

export function protectedAccountStore(): ProtectedAccountStore { return new ProtectedAccountStore(keyManagerDataApi()); }
