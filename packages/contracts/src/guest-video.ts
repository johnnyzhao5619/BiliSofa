import { DomainError, boundedMessage, finite, parseScope, record, text, type Scope } from './index.ts';
import { MAX_MEDIA_SECONDS } from './media-limits.ts';
export interface GuestVideoRequest { version: 1; scope: Scope; operation: 'guest-video-source' | 'guest-video-play'; bvid: string; }
export interface GuestVideoSummary { bvid: string; title: string; owner: string; durationSec: number; pages: number; width: number; height: number; videoCodec: string; audioCodec: string; }
export interface GuestVideoResult { version: 1; scope: Scope; operation: 'guest-video-source'; closed: true; code: string; summary?: GuestVideoSummary; }
/** Only normalized terminal failure codes; never arbitrary native/log strings. */
export function parseGuestFailureCode(value: unknown): string {
  const code=text(value,96);
  if(!/^ugc\.(cancelled|native_unavailable|bridge_stopped|bridge_failed_(10|12|16)|(?:view|playurl|video|audio)_(?:invalid_response|response_too_large|headers_too_large|unsupported|expired_source|duration_mismatch|cdn_unavailable|transport_[0-9]{1,3}|http_[1-5][0-9]{2}|api_error|range_invalid))$/.test(code)) throw new DomainError('invalid');
  return code;
}
export function parseGuestVideoRequest(value: unknown): GuestVideoRequest {
  const v = boundedMessage(value), raw = record(v.scope), scope = parseScope(raw), bvid = text(v.bvid, 12);
  if (v.version !== 1 || !['guest-video-source', 'guest-video-play'].includes(String(v.operation)) || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || scope.accountId !== 'guest' || ![scope.mediaSessionId, scope.requestId].every(id => /^[A-Za-z0-9_-]{1,64}$/.test(id)) || Object.keys(raw).length !== 4 || Object.keys(v).length !== 4 || Object.keys(v).some(k => !['version', 'scope', 'operation', 'bvid'].includes(k))) throw new DomainError('invalid');
  return { version: 1, scope, operation: v.operation as GuestVideoRequest['operation'], bvid };
}
export function parseGuestVideoResult(value: unknown): GuestVideoResult {
  const v = boundedMessage(value), scope = parseGuestVideoRequest({ version: 1, scope: v.scope, operation: 'guest-video-source', bvid: 'BV0000000000' }).scope;
  const code = text(v.code, 96);
  if (v.version !== 1 || v.operation !== 'guest-video-source' || v.closed !== true || Object.keys(v).some(k => !['version', 'scope', 'operation', 'closed', 'code', 'summary'].includes(k)) || !/^ugc\.(source_ranges_ok|cancelled|native_unavailable|(?:view|playurl|video|audio)_(?:invalid_response|response_too_large|headers_too_large|unsupported|expired_source|duration_mismatch|cdn_unavailable|transport_[0-9]{1,3}|http_[1-5][0-9]{2}|api_error|range_invalid))$/.test(code)) throw new DomainError('invalid');
  let summary: GuestVideoSummary | undefined;
  if (code === 'ugc.source_ranges_ok') {
    const s = record(v.summary), bvid = text(s.bvid, 12), title = text(s.title, 120), owner = text(s.owner, 48), durationSec = finite(s.durationSec, 1, MAX_MEDIA_SECONDS), pages = finite(s.pages, 1, 100), width = finite(s.width, 1, 640), height = finite(s.height, 1, 640);
    if (Object.keys(s).length !== 9 || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || ![pages, width, height].every(Number.isInteger) || !/^avc1\.[a-fA-F0-9]{6}$/.test(String(s.videoCodec)) || s.audioCodec !== 'mp4a.40.2') throw new DomainError('invalid');
    summary = { bvid, title, owner, durationSec, pages, width, height, videoCodec: String(s.videoCodec), audioCodec: s.audioCodec };
  } else if (v.summary !== undefined) throw new DomainError('invalid');
  return { version: 1, scope, operation: 'guest-video-source', closed: true, code, ...(summary ? { summary } : {}) };
}

// Worker-private normalized playback metadata. Never serialize this as UI/report IPC.
export interface GuestVideoDetail { bvid: string; cid: string; title: string; owner: string; durationSec: number; pages: number; }
export interface GuestTrack { url: string; codec: string; bandwidth: number; initialization: string; indexRange: string; width?: number; height?: number; }
export interface GuestVideoPlan { detail: GuestVideoDetail; durationSec: number; video: GuestTrack; audio: GuestTrack; expiresAt: number; usedBackup: boolean; }

export interface GuestBridgeEvent { version: 1; scope: Scope; operation: 'guest-video-play'; closed: boolean; code: string; url?: string; summary?: GuestVideoSummary; }
export function parseGuestBridgeEvent(value: unknown): GuestBridgeEvent {
  const v = boundedMessage(value), scope = parseGuestVideoRequest({ version: 1, scope: v.scope, operation: 'guest-video-play', bvid: 'BV0000000000' }).scope;
  if (v.version !== 1 || v.operation !== 'guest-video-play' || typeof v.closed !== 'boolean' || Object.keys(v).some(k => !['version', 'scope', 'operation', 'closed', 'code', 'url', 'summary'].includes(k))) throw new DomainError('invalid');
  if (!v.closed) {
    if (/^ugc[.](source_refresh_once|source_backup_selected|range_retry_once|bridge_(manifest|video|audio)_served|bridge_issue_[0-5]?[0-9]{1,2}_curl_[0-9]{1,3})$/.test(String(v.code))) {
      if (v.url !== undefined || v.summary !== undefined) throw new DomainError('invalid');
      return { version: 1, scope, operation: 'guest-video-play', closed: false, code: String(v.code) };
    }
    const url = text(v.url, 128);
    if (v.code !== 'ugc.bridge_ready' || !/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest\.mpd$/.test(url)) throw new DomainError('invalid');
    const summary = parseGuestVideoResult({ version: 1, scope, operation: 'guest-video-source', closed: true, code: 'ugc.source_ranges_ok', summary: v.summary }).summary!;
    return { version: 1, scope, operation: 'guest-video-play', closed: false, code: v.code, url, summary };
  }
  if (v.url !== undefined || v.summary !== undefined) throw new DomainError('invalid');
  const code = text(v.code, 96);
  if (!/^ugc\.(bridge_stopped|bridge_failed_(10|12|16))$/.test(code)) parseGuestVideoResult({ version: 1, scope, operation: 'guest-video-source', closed: true, code });
  return { version: 1, scope, operation: 'guest-video-play', closed: true, code };
}
