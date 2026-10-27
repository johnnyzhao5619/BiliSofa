import { parseServiceProfile, type ServiceProfile } from '../../../../packages/contracts/src/service-configuration.ts';
export interface ServiceEntry { id: string; inputHosts: string[]; file: string; }
const STORAGE_KEY = 'bilisofa.service-selection.v1';
const ID = /^[a-z][a-z0-9-]{0,47}$/;
/** Only a hostname or HTTPS origin, without credentials, path, query or port. */
export function serviceInputHost(raw: string): string {
  if (raw.length > 300 || /[\s\\\u0000-\u001f]/.test(raw.trim())) throw new Error('service.invalid_input');
  const value = raw.trim();
  const url = new URL(value.includes('://') ? value : 'https://' + value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash
      || !/^[a-z0-9.-]{1,253}$/.test(url.hostname)) throw new Error('service.invalid_input');
  return url.hostname;
}
async function localJson(file: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000);
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(file, { signal: controller.signal });
    if (!response.ok) throw new Error('service.local_file_failed');
    const raw = await response.text();
    if (raw.length > 65536) throw new Error('service.config_too_large');
    return JSON.parse(raw) as unknown;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export async function serviceCatalog(): Promise<ServiceEntry[]> {
  const raw = await localJson('service-providers/catalog.json');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('service.catalog_invalid');
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).length !== 2 || value.schema !== 1 || !Array.isArray(value.profiles) || value.profiles.length > 8) throw new Error('service.catalog_invalid');
  const seen = new Set<string>();
  return value.profiles.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('service.catalog_invalid');
    const entry = item as Record<string, unknown>;
    if (Object.keys(entry).length !== 3 || typeof entry.id !== 'string' || !ID.test(entry.id) || seen.has(entry.id)
        || entry.file !== `service-providers/${entry.id}.json` || !Array.isArray(entry.inputHosts)
        || !entry.inputHosts.length || entry.inputHosts.length > 8
        || !entry.inputHosts.every(host => typeof host === 'string' && serviceInputHost(host) === host)) throw new Error('service.catalog_invalid');
    seen.add(entry.id);
    return { id: entry.id, file: entry.file, inputHosts: [...entry.inputHosts] as string[] };
  });
}
export async function selectService(raw: string, catalog: readonly ServiceEntry[], signal?: AbortSignal): Promise<{ host: string; profile: ServiceProfile }> {
  const host = serviceInputHost(raw), entry = catalog.find(p => p.inputHosts.includes(host));
  if (!entry) throw new Error('service.unsupported');
  const profile = parseServiceProfile(await localJson(entry.file, signal));
  if (signal?.aborted || profile.id !== entry.id || !profile.inputHosts.includes(host)) throw new Error('service.profile_mismatch');
  return { host, profile };
}
export function savedService(): string | undefined {
  try { const value = globalThis.localStorage.getItem(STORAGE_KEY); return value && value.length <= 253 ? value : undefined; } catch { return undefined; }
}
export function rememberService(host: string): boolean {
  try { globalThis.localStorage.setItem(STORAGE_KEY, host); return true; } catch { return false; }
}
/** Used only after the business shell has closed; does not erase accounts/data. */
export function forgetService(): boolean {
  try { globalThis.localStorage.removeItem(STORAGE_KEY); return globalThis.localStorage.getItem(STORAGE_KEY) === null; } catch { return false; }
}
