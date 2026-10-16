import type { Verdict } from '../../../../packages/contracts/src/index.ts';
export interface ProbeKeyManagerApi {
  saveData(name: string, rawData: string, password: null, success: () => void, error: () => void): void;
  getData(alias: { name: string; packageId?: string }): unknown;
  removeData(alias: { name: string }): void;
}
const owners = new WeakMap<ProbeKeyManagerApi, { busy: boolean }>();
const notFound = (error: unknown) => !!error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError';
export interface KeyManagerProbeResult { verdict: Verdict; code: string; }
// Synthetic bytes only. Never enumerate aliases, grant permissions or inspect session data.
// A successful round trip proves API behavior, not encryption/cross-app access protection.
export function probeKeyManager(api: ProbeKeyManagerApi | undefined, signal: AbortSignal): Promise<KeyManagerProbeResult> {
  if (!api || ['saveData', 'getData', 'removeData'].some(key => typeof (api as unknown as Record<string, unknown>)[key] !== 'function')) return Promise.resolve({ verdict: 'BLOCKED', code: 'keymanager.api_unavailable' });
  if (signal.aborted) return Promise.resolve({ verdict: 'UNVERIFIED', code: 'keymanager.cancelled_before_write' });
  const owner = owners.get(api) ?? { busy: false };
  owners.set(api, owner);
  if (owner.busy) return Promise.resolve({ verdict: 'BLOCKED', code: 'keymanager.previous_write_cleanup_unconfirmed' });
  let nonce: string;
  try { nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''); }
  catch { return Promise.resolve({ verdict: 'BLOCKED', code: 'keymanager.random_unavailable' }); }
  const alias = { name: `bilisofa.w01.synthetic.${nonce}` };
  const value = `synthetic-nonsecret-${nonce}`;
  owner.busy = true;
  const cleanup = () => {
    try { api.removeData(alias); } catch (error) { if (!notFound(error)) return false; }
    try { api.getData(alias); return false; } catch (error) { return notFound(error); }
  };
  return new Promise(resolve => {
    let settled = false, completed = false;
    const finish = (verdict: Verdict, code: string) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); resolve({ verdict, code });
    };
    const cancel = () => finish('UNVERIFIED', 'keymanager.cancelled_write_outcome_unknown');
    const timer = setTimeout(() => finish('FAIL', 'keymanager.save_outcome_unknown'), 5000);
    signal.addEventListener('abort', cancel, { once: true });
    const saved = () => {
      if (completed) return;
      completed = true;
      // A late successful write still belongs to this invocation; remove only its alias.
      if (settled) { if (cleanup()) owner.busy = false; return; }
      let matches = false;
      try { matches = api.getData(alias) === value; } catch { /* Cleanup still required. */ }
      const absent = cleanup();
      if (absent) owner.busy = false;
      finish(matches && absent ? 'PASS' : 'FAIL', matches && absent ? 'keymanager.synthetic_roundtrip_cleanup_only' : !absent ? 'keymanager.cleanup_unconfirmed' : 'keymanager.readback_mismatch');
    };
    const failed = () => {
      if (completed) return;
      completed = true;
      // The save error does not establish absence. Attempt cleanup/absence check only for this owned alias.
      if (cleanup()) owner.busy = false;
      finish('FAIL', 'keymanager.save_failed_outcome_unverified');
    };
    try { api.saveData(alias.name, value, null, saved, failed); }
    catch { failed(); }
  });
}
