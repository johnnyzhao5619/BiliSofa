import { record } from '../../../../packages/contracts/src/index.ts';
export interface ProbePreference { version: 1; marker: number; }
// Non-sensitive probe marker only. Does not accept account/session objects.
export class ProbePreferences {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {}
  read(): ProbePreference | undefined {
    try {
      const raw = this.storage.getItem('bilisofa.probe.preference.v1');
      if (!raw || raw.length > 256) return undefined;
      const v = record(JSON.parse(raw));
      if (v.version !== 1 || !Number.isSafeInteger(v.marker) || Number(v.marker) < 0 || Object.keys(v).length !== 2) return undefined;
      return { version: 1, marker: v.marker as number };
    } catch { return undefined; }
  }
  write(marker: number): boolean {
    if (!Number.isSafeInteger(marker) || marker < 0) return false;
    try { this.storage.setItem('bilisofa.probe.preference.v1', JSON.stringify({ version: 1, marker })); return true; }
    catch { return false; }
  }
}
