import { DomainError } from '../../contracts/src/index.ts';
import { vodInteger } from '../../contracts/src/vod-catalog.ts';
import type { PrivateVodPlan, PrivateVodTrack, VodSourceTotals } from '../../contracts/src/vod-private.ts';
import { guestBridgeManifestUrl } from './guest-mpd.ts';

function ranges(track: PrivateVodTrack, total: number): { init: number; end: number } {
  vodInteger(total, 512, 1099511627776);
  const init = /^0-([0-9]{1,8})$/.exec(track.initialization), index = /^([0-9]{1,8})-([0-9]{1,8})$/.exec(track.indexRange);
  if (!init || !index) throw new DomainError('invalid');
  const begin = Number(init[1]), end = Number(index[2]);
  if (begin < 8 || Number(index[1]) !== begin + 1 || end <= begin || end > 16777216 || total <= end) throw new DomainError('invalid');
  if (`0-${begin}` !== track.initialization || `${begin + 1}-${end}` !== track.indexRange) throw new DomainError('invalid');
  return { init: begin, end };
}
/** Canonical, independently checked native input. No title/URL/XML injection. */
export function vodBridgeMetadata(plan: PrivateVodPlan, totals: VodSourceTotals): string {
  const video = plan.video, audio = plan.audio;
  if (!/^avc1\.[a-fA-F0-9]{6}$/.test(video.codec) && !/^(?:hev1|hvc1|av01)\.[A-Za-z0-9.]{1,59}$/.test(video.codec) ||
      !['mp4a.40.2', 'ec-3', 'fLaC'].includes(audio.codec)) throw new DomainError('invalid');
  const v = ranges(video, totals.video), a = ranges(audio, totals.audio);
  return [vodInteger(plan.durationMs, 1, 86400000), vodInteger(video.width, 1, 16384), vodInteger(video.height, 1, 8640),
    vodInteger(video.bandwidth, 1, 200000000), vodInteger(audio.bandwidth, 1, 16000000), v.init, v.end, a.init, a.end,
    totals.video, totals.audio, video.codec, audio.codec].join(',');
}
/** Only the nonce's two loopback paths appear in the manifest. */
export function createVodMpd(plan: PrivateVodPlan, totals: VodSourceTotals, token: string): string {
  const metadata = vodBridgeMetadata(plan, totals).split(',');
  const [ms, w, h, vb, ab, vi, vx, ai, ax, _vt, _at, vc, ac] = metadata;
  const base = guestBridgeManifestUrl(token).replace(/manifest\.mpd$/, '');
  const duration = `${Math.floor(Number(ms) / 1000)}.${String(Number(ms) % 1000).padStart(3, '0')}`;
  return `<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" mediaPresentationDuration="PT${duration}S" minBufferTime="PT1.5S"><Period start="PT0S"><AdaptationSet contentType="video" mimeType="video/mp4"><Representation id="v1" bandwidth="${vb}" codecs="${vc}" width="${w}" height="${h}"><BaseURL>${base}video.mp4</BaseURL><SegmentBase indexRange="${Number(vi) + 1}-${vx}"><Initialization range="0-${vi}"/></SegmentBase></Representation></AdaptationSet><AdaptationSet contentType="audio" mimeType="audio/mp4"><Representation id="a1" bandwidth="${ab}" codecs="${ac}"><BaseURL>${base}audio.mp4</BaseURL><SegmentBase indexRange="${Number(ai) + 1}-${ax}"><Initialization range="0-${ai}"/></SegmentBase></Representation></AdaptationSet></Period></MPD>`;
}
