import { DomainError, finite } from '../../contracts/src/index.ts';
import type { GuestVideoPlan, GuestTrack } from '../../contracts/src/guest-video.ts';
import { MAX_MEDIA_SECONDS } from '../../contracts/src/media-limits.ts';
function tokenValue(token: string): string { if (!/^[a-f0-9]{32}$/.test(token)) throw new DomainError('invalid'); return token; }
export function guestBridgeManifestUrl(token: string): string { return `http://127.0.0.1:40324/${tokenValue(token)}/manifest.mpd`; }
export function isGuestBridgeManifestUrl(url: string, token: string): boolean { return url === guestBridgeManifestUrl(token); }
function segment(t: GuestTrack): string {
  const a = /^0-([0-9]{1,7})$/.exec(t.initialization), b = /^([0-9]{1,7})-([0-9]{1,7})$/.exec(t.indexRange);
  if (!a || !b || Number(a[1]) < 8 || Number(b[1]) !== Number(a[1]) + 1 || Number(b[2]) < Number(b[1]) || Number(b[2]) > 1048576) throw new DomainError('invalid');
  return `<SegmentBase indexRange="${t.indexRange}"><Initialization range="${t.initialization}"/></SegmentBase>`;
}
function int(value: unknown, max: number): number { const n = finite(value, 1, max); if (!Number.isInteger(n)) throw new DomainError('invalid'); return n; }
// All BaseURLs address this playback's fixed local paths; no external URL, text
// or signature is interpolated. Native owns the corresponding two destinations.
export function createGuestMpd(plan: GuestVideoPlan, token: string): string {
  tokenValue(token);
  const duration = finite(plan.durationSec, 1, MAX_MEDIA_SECONDS), video = plan.video, audio = plan.audio;
  if (!/^avc1\.[a-fA-F0-9]{6}$/.test(video.codec) || audio.codec !== 'mp4a.40.2') throw new DomainError('invalid');
  const base = `http://127.0.0.1:40324/${token}/`;
  return `<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" mediaPresentationDuration="PT${duration.toFixed(3)}S" minBufferTime="PT1.5S"><Period start="PT0S"><AdaptationSet contentType="video" mimeType="video/mp4"><Representation id="v1" bandwidth="${int(video.bandwidth, 3000000)}" codecs="${video.codec}" width="${int(video.width, 640)}" height="${int(video.height, 640)}"><BaseURL>${base}video.mp4</BaseURL>${segment(video)}</Representation></AdaptationSet><AdaptationSet contentType="audio" mimeType="audio/mp4"><Representation id="a1" bandwidth="${int(audio.bandwidth, 256000)}" codecs="mp4a.40.2"><BaseURL>${base}audio.mp4</BaseURL>${segment(audio)}</Representation></AdaptationSet></Period></MPD>`;
}

// Canonical numeric metadata for the independently checked native serializer.
export function guestBridgeMetadata(plan: GuestVideoPlan): string {
  createGuestMpd(plan, '00000000000000000000000000000000');
  return [Math.round(plan.durationSec * 1000), plan.video.width, plan.video.height, plan.video.bandwidth, plan.audio.bandwidth, plan.video.initialization.split('-')[1], plan.video.indexRange.split('-')[1], plan.audio.initialization.split('-')[1], plan.audio.indexRange.split('-')[1], plan.video.codec].join(',');
}
