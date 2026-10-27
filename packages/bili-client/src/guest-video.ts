import { serviceString } from '../../contracts/src/service-configuration.ts';
import { DomainError, finite, record, text } from '../../contracts/src/index.ts';
import type { GuestVideoDetail, GuestVideoPlan, GuestTrack } from '../../contracts/src/guest-video.ts';
import { MAX_MEDIA_MS, MAX_MEDIA_SECONDS } from '../../contracts/src/media-limits.ts';
export type { GuestVideoDetail, GuestVideoPlan, GuestTrack } from '../../contracts/src/guest-video.ts';
export class GuestVideoError extends Error { constructor(readonly reason: 'api_error' | 'unsupported' | 'expired_source' | 'duration_mismatch' | 'cdn_unavailable') { super(reason); } }
function body(raw: string, limit = 131072): Record<string, unknown> {
  if (new TextEncoder().encode(raw).length > limit) throw new DomainError('invalid');
  let v: unknown; try { v = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(v), code = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(code)) throw new DomainError('invalid');
  if (code !== 0) throw new GuestVideoError('api_error');
  return record(root.data);
}
function integer(value: unknown, min: number, max: number): number { const n = finite(value, min, max); if (!Number.isInteger(n)) throw new DomainError('invalid'); return n; }
export function parseGuestVideoDetail(raw: string, bvid: string): GuestVideoDetail {
  const d = body(raw, 524288), rights = record(d.rights);
  if (d.bvid !== bvid || !/^BV[A-Za-z0-9]{10}$/.test(bvid)) throw new DomainError('invalid');
  if (d.state !== 0 || ['pay', 'ugc_pay', 'is_stein_gate'].some(key => rights[key] !== 0) || ['movie', 'arc_pay', 'ugc_pay_preview', 'is_360'].some(key => rights[key] !== undefined && rights[key] !== 0) || ['is_chargeable_season', 'is_upower_exclusive', 'is_upower_play', 'is_upower_preview'].some(key => d[key] !== undefined && d[key] !== false && d[key] !== 0) || d.redirect_url) throw new GuestVideoError('unsupported');
  if (!Array.isArray(d.pages) || !d.pages.length || d.pages.length > 100) throw new DomainError('invalid');
  const first = record(d.pages[0]), cid = integer(first.cid, 1, Number.MAX_SAFE_INTEGER);
  if (first.page !== 1 || first.from !== 'vupload' || d.cid !== cid) throw new GuestVideoError('unsupported');
  return { bvid, cid: String(cid), title: text(d.title, 512).slice(0, 120), owner: text(record(d.owner).name, 128).slice(0, 48), durationSec: integer(first.duration, 1, MAX_MEDIA_SECONDS), pages: d.pages.length };
}
// This policy is deliberately narrower than all Bilibili CDNs. Every primary or
// backup must pass the same destination policy. URLs stay inside the Worker.
export function guestCdnUrl(value: unknown, now: number): { url: string; expiresAt: number } {
  const raw = text(value, 2048);
  if (!/^[\x21-\x7e]+$/.test(raw) || /[\\#]/.test(raw)) throw new DomainError('invalid');
  let u: URL; try { u = new URL(raw); } catch { throw new DomainError('invalid'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !new RegExp(serviceString('a_199f07083b7f'), "").test(u.hostname) || !u.pathname.endsWith('.m4s')) throw new DomainError('invalid');
  const deadlines = u.searchParams.getAll('deadline');
  if (deadlines.length !== 1 || !/^[0-9]{10}$/.test(deadlines[0]!)) throw new DomainError('invalid');
  const expiresAt = Number(deadlines[0]) * 1000;
  if (expiresAt < now + 60000) throw new GuestVideoError('expired_source');
  if (expiresAt > now + 86400000) throw new DomainError('invalid');
  return { url: raw, expiresAt };
}
function trackCdn(t: Record<string, unknown>, now: number): { url: string; expiresAt: number; usedBackup: boolean } {
  const backup = t.backupUrl ?? t.backup_url ?? [];
  if (!Array.isArray(backup) || backup.length > 4) throw new DomainError('invalid');
  const candidates = [t.baseUrl ?? t.base_url, ...backup];
  let expired = false;
  for (let i = 0; i < candidates.length; i++) {
    try { return { ...guestCdnUrl(candidates[i], now), usedBackup: i > 0 }; }
    catch (error) { expired ||= error instanceof GuestVideoError && error.reason === 'expired_source'; }
  }
  // Unsupported hosts are never requested, rewritten or forwarded to native.
  throw new GuestVideoError(expired ? 'expired_source' : 'cdn_unavailable');
}
function track(value: unknown, kind: 'video' | 'audio', now: number): { track: GuestTrack; expiresAt: number; usedBackup: boolean } {
  const t = record(value), segment = record(t.SegmentBase ?? t.segment_base), cdn = trackCdn(t, now), codec = text(t.codecs, 32);
  if (t.mimeType !== `${kind}/mp4` && t.mime_type !== `${kind}/mp4`) throw new DomainError('invalid');
  if (kind === 'video' ? !/^avc1\.[a-fA-F0-9]{6}$/.test(codec) || t.id !== 16 : codec !== 'mp4a.40.2' || t.id !== 30216) throw new GuestVideoError('unsupported');
  const initialization = text(segment.Initialization ?? segment.initialization, 32), indexRange = text(segment.indexRange ?? segment.index_range, 32);
  const a = /^0-([0-9]{1,7})$/.exec(initialization), b = /^([0-9]{1,7})-([0-9]{1,7})$/.exec(indexRange);
  if (!a || !b || Number(a[1]) < 8 || Number(b[1]) !== Number(a[1]) + 1 || Number(b[2]) < Number(b[1]) || Number(b[2]) > 1048576) throw new DomainError('invalid');
  if (t.drm_tech_type || t.drm || t.content_protection) throw new GuestVideoError('unsupported');
  const result: GuestTrack = { url: cdn.url, codec, bandwidth: integer(t.bandwidth, 1, kind === 'video' ? 3000000 : 256000), initialization, indexRange };
  if (kind === 'video') { result.width = integer(t.width, 1, 640); result.height = integer(t.height, 1, 640); }
  return { track: result, expiresAt: cdn.expiresAt, usedBackup: cdn.usedBackup };
}
export function parseGuestVideoPlan(raw: string, detail: GuestVideoDetail, now = Date.now()): GuestVideoPlan {
  const d = body(raw), dash = record(d.dash);
  if (d.quality !== 16 || d.is_preview || d.drm_tech_type || d.durl || !Array.isArray(dash.video) || !Array.isArray(dash.audio) || dash.video.length > 32 || dash.audio.length > 16) throw new GuestVideoError('unsupported');
  const durationSec = finite(dash.duration, 1, MAX_MEDIA_SECONDS), time = finite(d.timelength, 1, MAX_MEDIA_MS);
  if (Math.abs(durationSec - detail.durationSec) > 3 || Math.abs(time / 1000 - durationSec) > 3) throw new GuestVideoError('duration_mismatch');
  const v = dash.video.filter(v => { const r = record(v); return r.id === 16 && /^avc1\./.test(String(r.codecs)); });
  const a = dash.audio.filter(v => record(v).id === 30216);
  if (v.length !== 1 || a.length !== 1) throw new GuestVideoError('unsupported');
  const video = track(v[0], 'video', now), audio = track(a[0], 'audio', now);
  return { detail, durationSec, video: video.track, audio: audio.track, expiresAt: Math.min(video.expiresAt, audio.expiresAt), usedBackup: video.usedBackup || audio.usedBackup };
}
