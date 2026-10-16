import { parseGuestVideoRequest, parseGuestVideoResult, parseGuestBridgeEvent, type GuestBridgeEvent, type GuestVideoRequest, type GuestVideoResult } from '../../../../packages/contracts/src/guest-video.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class GuestVideoWorker extends ScopedGuestWorker<GuestVideoRequest, GuestVideoResult> {
  constructor() { super('guest-video-worker.js', 'guest-video-source', value => { const q = parseGuestVideoRequest(value); if (q.operation !== 'guest-video-source') throw new Error('invalid'); return q; }, parseGuestVideoResult, 45000, 35000, (request, result) => !result.summary || result.summary.bvid === request.bvid); }
}

export class GuestBridgeWorker extends ScopedGuestWorker<GuestVideoRequest, GuestBridgeEvent> {
  constructor() { super('guest-video-worker.js', 'guest-video-play', value => { const q = parseGuestVideoRequest(value); if (q.operation !== 'guest-video-play') throw new Error('invalid'); return q; }, parseGuestBridgeEvent, 1050000, 12000, (q, r) => !r.summary || r.summary.bvid === q.bvid, true); }
}
