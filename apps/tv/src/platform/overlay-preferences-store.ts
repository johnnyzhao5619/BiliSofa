import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { localOwner, type LocalIssue, type LocalWrite } from '../../../../packages/contracts/src/local-profile.ts';
import { overlayDefaults, parseOverlayPreferences, type OverlayPreferences } from '../../../../packages/contracts/src/media-overlays.ts';
type Read = { kind: 'ok'; value: OverlayPreferences } | { kind: LocalIssue };
export interface OverlayPreferenceStore { read(): Read; save(value: OverlayPreferences): LocalWrite; clear(): LocalWrite; }
type StorageApi = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** Separate schema/key: no migration of old playback preferences, enumeration,
 * credentials or deletion of retained account-write intents. */
export class OverlayProfiles {
  constructor(private readonly storage: StorageApi | undefined) {}
  profile(owner: string): OverlayPreferenceStore {
    const key = 'bilisofa.overlays.v1.' + localOwner(owner), storage = this.storage;
    const read = (): Read => {
      if (!storage) return { kind: 'unavailable' };
      let raw: string | null; try { raw = storage.getItem(key); } catch { return { kind: 'unavailable' }; }
      if (raw === null) return { kind: 'ok', value: overlayDefaults() };
      try { if (raw.length > 16384) throw new DomainError('invalid'); return { kind: 'ok', value: parseOverlayPreferences(JSON.parse(raw)) }; }
      catch (error) { return { kind: error instanceof DomainError && error.code === 'unsupported' ? 'future' : 'corrupt' }; }
    };
    return {
      read,
      save(value) {
        const parsed = parseOverlayPreferences(value), previous = read(); if (previous.kind !== 'ok') return previous.kind;
        const raw = JSON.stringify(parsed);
        try { storage!.setItem(key, raw); return storage!.getItem(key) === raw ? 'saved' : 'unconfirmed'; } catch { return 'unconfirmed'; }
      },
      clear() {
        if (!storage) return 'unavailable';
        try { storage.removeItem(key); return storage.getItem(key) === null ? 'deleted' : 'unconfirmed'; } catch { return 'unconfirmed'; }
      },
    };
  }
}
/** UI settings use the same identity partition as the media adapter. */
export function localOverlayPreferences(owner:string):OverlayPreferenceStore {
  let storage:Storage|undefined;try{storage=globalThis.localStorage;}catch{/* Unavailable remains explicit. */}
  return new OverlayProfiles(storage).profile(owner);
}
