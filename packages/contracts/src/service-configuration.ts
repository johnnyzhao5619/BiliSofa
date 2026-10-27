/** Trusted, packaged service data. A hostname selects a profile; it never becomes
 * an arbitrary fetch destination. No provider is active by default. */
export interface ServiceProfile {
  schema: 1;
  id: string;
  inputHosts: readonly string[];
  strings: Readonly<Record<string, string>>;
  nativeKeys: readonly string[];
  platformOrigins: readonly string[];
  addresses: Readonly<Record<string, string>>;
}
interface ServiceRealm { __bilisofaServiceProfile?: ServiceProfile; }
const realm = globalThis as unknown as ServiceRealm;
const idPattern = /^[a-z][a-z0-9-]{0,47}$/;
const keyPattern = /^a_[a-f0-9]{12}$/;
function invalid(): never { throw new Error('service.configuration_invalid'); }
export function parseServiceProfile(value: unknown): ServiceProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 7 || v.schema !== 1 || typeof v.id !== 'string' || !idPattern.test(v.id)
      || !Array.isArray(v.inputHosts) || v.inputHosts.length < 1 || v.inputHosts.length > 8
      || !v.inputHosts.every(x => typeof x === 'string' && /^[a-z0-9.-]{1,253}$/.test(x))
      || !v.strings || typeof v.strings !== 'object' || Array.isArray(v.strings)
      || !Array.isArray(v.nativeKeys) || v.nativeKeys.length < 1 || v.nativeKeys.length > 256
      || !Array.isArray(v.platformOrigins) || v.platformOrigins.length > 8
      || !v.addresses || typeof v.addresses !== 'object' || Array.isArray(v.addresses)) return invalid();
  const addresses = Object.entries(v.addresses);
  if (!addresses.length || addresses.length > 64 || addresses.some(([key, item]) => !/^[a-z][a-zA-Z0-9]{0,47}$/.test(key)
      || typeof item !== 'string' || !/^[a-z0-9.-]{1,253}$/.test(item))) return invalid();
  const addressMap = Object.freeze(Object.fromEntries(addresses)) as Readonly<Record<string, string>>;
  const expand = (template: string): string => template.replace(/\{([a-z][a-zA-Z0-9]*)(\|regex)?\}/g, (_whole, key: string, regex: string | undefined) => {
    const value = addressMap[key]; if (value === undefined) return invalid();
    return regex ? value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : value;
  });
  if (!v.platformOrigins.every(x => typeof x === 'string' && /^https:\/\/[a-z0-9.-]+$/.test(expand(x)))) return invalid();
  const strings = v.strings as Record<string, unknown>, entries = Object.entries(strings);
  if (entries.length < v.nativeKeys.length || entries.length > 512
      || entries.some(([key, item]) => !keyPattern.test(key) || typeof item !== 'string' || !/^[\x20-\x7e]{1,511}$/.test(item))
      || new Set(v.nativeKeys).size !== v.nativeKeys.length
      || !v.nativeKeys.every(x => typeof x === 'string' && keyPattern.test(x) && Object.hasOwn(strings, x))) return invalid();
  // Profile and catalog live inside the signed WGT, not at a user-controlled URL.
  const expanded = Object.fromEntries(entries.map(([key, value]) => [key, expand(value as string)]));
  if (Object.values(expanded).some(value => !/^[\x20-\x7e]{1,511}$/.test(value))) return invalid();
  return Object.freeze({ schema: 1, id: v.id, inputHosts: Object.freeze([...v.inputHosts]) as readonly string[],
    strings: Object.freeze(expanded), addresses: addressMap,
    nativeKeys: Object.freeze([...v.nativeKeys]) as readonly string[],
    platformOrigins: Object.freeze(v.platformOrigins.map(x => expand(x as string))) });
}
export function activateServiceProfile(value: unknown): ServiceProfile {
  if (realm.__bilisofaServiceProfile) throw new Error('service.already_active');
  const profile = parseServiceProfile(value); realm.__bilisofaServiceProfile = profile; return profile;
}
export function serviceProfile(): ServiceProfile {
  if (!realm.__bilisofaServiceProfile) throw new Error('service.not_configured');
  return realm.__bilisofaServiceProfile;
}
export function serviceString(key: string): string {
  const value = serviceProfile().strings[key]; if (value === undefined) return invalid(); return value;
}
/** Native config is applied once, before main() and before any cookie import. */
export function configureServiceNative<T extends object>(module: T): T {
  const m = module as T & {
    onRuntimeInitialized?: () => void; HEAPU8?: Uint8Array;
    _service_config_pointer?: () => number; _service_config_capacity?: () => number;
    _service_config_apply?: (length: number) => number;
    _service_config_count?: () => number; _service_config_key_word?: (index: number, part: number) => number;
  };
  const initialized = m.onRuntimeInitialized;
  m.onRuntimeInitialized = () => {
    const profile = serviceProfile();
    if (!m._service_config_pointer || !m._service_config_capacity || !m._service_config_apply || !m._service_config_count || !m._service_config_key_word || !(m.HEAPU8 instanceof Uint8Array)) return invalid();
    if (m._service_config_count() !== profile.nativeKeys.length || profile.nativeKeys.some((key, index) =>
      m._service_config_key_word!(index, 0) !== Number.parseInt(key.slice(2, 8), 16)
      || m._service_config_key_word!(index, 1) !== Number.parseInt(key.slice(8, 14), 16))) return invalid();
    const bytes = new TextEncoder().encode(profile.nativeKeys.map(key => serviceString(key) + '\0').join(''));
    const at = m._service_config_pointer(), capacity = m._service_config_capacity();
    if (!Number.isSafeInteger(at) || at < 0 || !Number.isSafeInteger(capacity) || capacity < bytes.length || capacity > 131072 || at + capacity > m.HEAPU8.length) return invalid();
    m.HEAPU8.fill(0, at, at + capacity); m.HEAPU8.set(bytes, at);
    if (m._service_config_apply(bytes.length) !== 1) return invalid();
    initialized?.call(m);
  };
  return module;
}
