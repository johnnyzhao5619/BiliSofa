import { parseReceiverSnapshot, receiverId, type ReceiverSnapshot } from '../../../../packages/contracts/src/cast-receiver.ts';
import { parseCastProbeRequest, parseCastProbeResult, type CastProbeRequest, type CastProbeResult } from '../../../../packages/contracts/src/cast-probe.ts';
import { CAST_PROGRESS_LIMIT } from '../../../../packages/contracts/src/upnp.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class CastProbeWorker extends ScopedGuestWorker<CastProbeRequest, CastProbeResult> {
  approveCandidate(receiver = false): boolean { return this.sendControl(receiver ? 'play-receiver' : 'play-candidate'); }
  snapshot(value: ReceiverSnapshot): boolean { return this.sendControl('receiver-snapshot', parseReceiverSnapshot(value)); }
  acknowledge(id: number, accepted: boolean): boolean { return this.sendControl('receiver-ack', { id: receiverId(id), accepted }); }
  seekResult(ok: boolean): boolean { return this.sendControl(ok ? 'receiver-seek-complete' : 'receiver-command-failed'); }
  constructor() { super('cast-worker.js', 'cast-discovery', parseCastProbeRequest, parseCastProbeResult, 310000, 5000, () => true, true, CAST_PROGRESS_LIMIT, true); }
}
export function castProbeIdentity(storage?: Storage): { uuid: string; token: string } {
  const random = () => { const v = new Uint8Array(16); crypto.getRandomValues(v); return v; };
  const token = Array.from(random(), n => n.toString(16).padStart(2, '0')).join('');
  const valid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
  let uuid: string | null | undefined;
  try { uuid = storage?.getItem('bilisofa.probe.discovery-uuid'); } catch { /* Per-document identity if nonsecret storage is denied. */ }
  if (!valid(uuid)) {
    const bytes = random(); bytes[6] = bytes[6]! & 15 | 64; bytes[8] = bytes[8]! & 63 | 128;
    const v = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
    uuid = `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}`;
    try { storage?.setItem('bilisofa.probe.discovery-uuid', uuid); } catch { /* Never use a hardware ID or account alias. */ }
  }
  return { uuid, token };
}
