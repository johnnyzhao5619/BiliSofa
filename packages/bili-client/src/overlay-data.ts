import { DomainError, record, text } from '../../contracts/src/index.ts';
import { vodInteger } from '../../contracts/src/vod-catalog.ts';
import { parseSubtitleCues, type SubtitleCue } from '../../contracts/src/media-overlays.ts';
import { parseOverlayDanmaku, type OverlayDanmaku, type SubtitleTrack } from '../../contracts/src/overlay-read.ts';
export interface PrivateSubtitleTrack { summary: SubtitleTrack; url: string; }
export function subtitleSource(value: unknown): string {
  let raw = text(value, 2048); if (raw.startsWith('//')) raw = 'https:' + raw;
  let url: URL; try { url = new URL(raw); } catch { throw new DomainError('invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !raw.startsWith(`https://${url.hostname}/`) || !['aisubtitle.hdslb.com', 'i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com'].includes(url.hostname) || !/^\/bfs\/(?:subtitle\/[A-Za-z0-9_./-]+\.json|ai_subtitle\/[A-Za-z0-9_./-]*[A-Za-z0-9_.-])$/.test(url.pathname) || /(?:^|\/)\.\.?\/|%/.test(raw.split('?')[0]!) || /[\\\s\u0000-\u001f]/.test(raw)) throw new DomainError('permission');
  return raw;
}
export function parsePlayerMetadata(raw: string, binding: { bvid: string; cid: string; aid: string }): { tracks: PrivateSubtitleTrack[]; loginRequired: boolean } {
  let root: Record<string, unknown>; try { root = record(JSON.parse(raw)); } catch { throw new DomainError('invalid'); }
  if (root.code !== 0) throw new DomainError(root.code === -101 ? 'login' : 'permission');
  const d = record(root.data);
  if (String(d.cid) !== binding.cid || String(d.aid) !== binding.aid || d.bvid !== undefined && d.bvid !== binding.bvid) throw new DomainError('invalid');
  const subtitles = record(d.subtitle), rows = subtitles.subtitles;
  if (!Array.isArray(rows) || rows.length > 64) throw new DomainError('invalid');
  // A track whose file address is outside the scoped hosts/paths is skipped, not fatal for the
  // other tracks (0.47.2). Keys keep the row index so a later re-read maps to the same track.
  const tracks = rows.flatMap((raw, i) => {
    const r = record(raw), language = text(r.lan, 32); if (!/^[A-Za-z0-9_-]+$/.test(language)) throw new DomainError('invalid');
    let url: string; try { url = subtitleSource(r.subtitle_url); } catch (error) { if (error instanceof DomainError && error.code === 'permission') return []; throw error; }
    return [{ summary: { key: `s${i}`, language, label: text(r.lan_doc, 80), automatic: Number(r.ai_type ?? 0) > 0 || language.startsWith('ai-') }, url }];
  });
  if (rows.length && !tracks.length) throw new DomainError('unsupported');
  return { tracks, loginRequired: d.need_login_subtitle === true || d.need_login_subtitle === 1 || subtitles.need_login === true };
}
export function parseSubtitleBody(raw: string): SubtitleCue[] {
  let rows: unknown; try { rows = record(JSON.parse(raw)).body; } catch { throw new DomainError('invalid'); }
  if (!Array.isArray(rows) || rows.length > 10000) throw new DomainError('invalid');
  return parseSubtitleCues(rows.map((raw, index) => { const r = record(raw), from = Number(r.from), to = Number(r.to); if (typeof r.from !== 'number' || typeof r.to !== 'number') throw new DomainError('invalid'); return { id: `subtitle-${index}`, startMs: from * 1000, endMs: to * 1000, content: r.content }; }));
}
/** Bounded subset of the official player's DmSegMobileReply schema. Unknown
 * fields are skipped; code/BAS/advanced modes are never interpreted. */
export function decodeDanmakuSegment(bytes: Uint8Array): OverlayDanmaku[] {
  if (!(bytes instanceof Uint8Array) || bytes.length > 4194304) throw new DomainError('invalid');
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  function fields(input: Uint8Array, visit: (field: number, wire: number, value: bigint | Uint8Array) => void): void {
    let at = 0, count = 0;
    function uint(): bigint { let n = 0n; for (let i = 0; i < 10; i++) { const b = input[at++]; if (b === undefined || i === 9 && b > 1) throw new DomainError('invalid'); n |= BigInt(b & 127) << BigInt(i * 7); if (!(b & 128)) return n; } throw new DomainError('invalid'); }
    while (at < input.length) {
      if (++count > 600000) throw new DomainError('invalid');
      const tag = uint(); if (tag > 0xffffffffn) throw new DomainError('invalid'); const field = Number(tag >> 3n), wire = Number(tag & 7n); if (!field) throw new DomainError('invalid');
      if (wire === 0) visit(field, wire, uint());
      else if (wire === 2 || wire === 1 || wire === 5) {
        const length = wire === 2 ? uint() : BigInt(wire === 1 ? 8 : 4); if (length > BigInt(input.length - at)) throw new DomainError('invalid');
        const end = at + Number(length); visit(field, wire, input.subarray(at, end)); at = end;
      } else throw new DomainError('invalid');
    }
  }
  const items: OverlayDanmaku[] = []; let elements = 0;
  fields(bytes, (field, wire, raw) => {
    if (field !== 1) return; if (wire !== 2 || typeof raw === 'bigint' || ++elements > 20000 || raw.length > 65536) throw new DomainError('invalid');
    let id = '', contentBytes: Uint8Array | undefined, mode = 0, timeMs = 0, color = 0; const seen = new Set<number>();
    fields(raw, (key, type, value) => {
      if (![1, 2, 3, 5, 7, 12].includes(key)) return;
      if (seen.has(key)) throw new DomainError('invalid'); seen.add(key);
      if ([1, 2, 3, 5].includes(key)) {
        if (type !== 0 || typeof value !== 'bigint') throw new DomainError('invalid');
        if (key === 1) { if (!id) id = value.toString(); }
        else if (value > 0xffffffffn) throw new DomainError('invalid');
        else if (key === 2) timeMs = Number(value); else if (key === 3) mode = Number(value); else color = Number(value);
      } else {
        if (type !== 2 || typeof value === 'bigint' || value.length > (key === 7 ? 65536 : 32)) throw new DomainError('invalid');
        if (key === 7) { contentBytes = value; return; }
        let s: string; try { s = utf8.decode(value); } catch { throw new DomainError('invalid'); }
        id = s;
      }
    });
    if (![1, 2, 3, 4, 5].includes(mode) || !contentBytes?.length) return;
    if (contentBytes.length > 2048) throw new DomainError('invalid');
    let content: string; try { content = utf8.decode(contentBytes); } catch { throw new DomainError('invalid'); }
    if (!/^[0-9]{1,20}$/.test(id) || id === '0') throw new DomainError('invalid');
    items.push({ id, timeMs, mode: mode === 4 ? 'bottom' : mode === 5 ? 'top' : 'scroll', color: vodInteger(color, 0, 0xffffff), content });
  });
  return parseOverlayDanmaku(items);
}
