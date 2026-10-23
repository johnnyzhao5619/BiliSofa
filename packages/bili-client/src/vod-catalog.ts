import { DomainError, record, text } from '../../contracts/src/index.ts';
import { parseVodCatalog, parseVodChoice, vodBvid, vodChoiceSupported, vodInteger, type AudioCodec, type VideoCodec, type VodCapabilities, type VodCatalog, type VodDetail, type VodItem } from '../../contracts/src/vod-catalog.ts';
import { GuestVideoError, guestCdnUrl } from './guest-video.ts';
import type { PrivateVodTrack, PrivateVodPlan } from '../../contracts/src/vod-private.ts';
export type { PrivateVodTrack, PrivateVodPlan } from '../../contracts/src/vod-private.ts';

export interface PrivateVodPart { item: VodItem; cid: string; }
/** These objects belong to the media Worker, never to a page or ordinary store. */
export interface PrivateVodDetail { summary: VodDetail; parts: PrivateVodPart[]; guestAllowed: boolean; }
export interface PrivateVodCatalog {
  summary: VodCatalog;
  cid: string;
  durationMs: number;
  video: PrivateVodTrack[];
  audio: PrivateVodTrack[];
}
function data(raw: string): Record<string, unknown> {
  if (new TextEncoder().encode(raw).length > 4194304) throw new DomainError('invalid');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(value), code = vodInteger(root.code, -2147483648, 2147483647);
  if (code !== 0) throw new GuestVideoError('api_error');
  return record(root.data);
}
function caption(value: unknown, max: number): string { return text(value, 2048).slice(0, max); }
function optionalFlag(value: unknown): boolean { return value !== undefined && value !== false && value !== 0; }
export function parseVodDetail(raw: string, bvid: string): PrivateVodDetail {
  vodBvid(bvid);
  const d = data(raw), rights = record(d.rights);
  if (d.bvid !== bvid) throw new DomainError('invalid');
  if (d.state !== 0 || d.redirect_url || rights.is_stein_gate !== 0 || optionalFlag(rights.is_360)) throw new GuestVideoError('unsupported');
  if (!Array.isArray(d.pages) || !d.pages.length || d.pages.length > 10000) throw new DomainError('invalid');
  const title = caption(d.title, 120), owner = caption(record(d.owner).name, 48);
  const parts = d.pages.map((rawPart, index): PrivateVodPart => {
    const p = record(rawPart), part = vodInteger(p.page, 1, 10000);
    if (part !== index + 1 || p.from !== 'vupload') throw new GuestVideoError('unsupported');
    const cid = String(vodInteger(p.cid, 1, Number.MAX_SAFE_INTEGER));
    return { cid, item: { bvid, part, title: caption(p.part, 120), durationMs: vodInteger(p.duration, 1, 86400) * 1000 } };
  });
  if (new Set(parts.map(p => p.cid)).size !== parts.length || String(d.cid) !== parts[0]!.cid) throw new DomainError('invalid');
  const guestAllowed = rights.pay === 0 && rights.ugc_pay === 0 && !['arc_pay', 'ugc_pay_preview', 'movie'].some(k => optionalFlag(rights[k])) &&
    !['is_chargeable_season', 'is_upower_exclusive', 'is_upower_play', 'is_upower_preview'].some(k => optionalFlag(d[k]));
  const summary: VodDetail = { title, owner, parts: parts.map(p => ({ ...p.item })) };
  if (d.ugc_season !== undefined && d.ugc_season !== null) {
    const season = record(d.ugc_season);
    if (!Array.isArray(season.sections) || season.sections.length > 128) throw new DomainError('invalid');
    const entries: NonNullable<VodDetail['collection']>['entries'] = [];
    const seen = new Set<string>();
    for (const sectionRaw of season.sections) {
      const section = record(sectionRaw);
      if (!Array.isArray(section.episodes) || section.episodes.length > 10000 || entries.length + section.episodes.length > 10000) throw new DomainError('invalid');
      for (const episodeRaw of section.episodes) {
        const episode = record(episodeRaw), entryTitle = caption(episode.title, 120);
        // Only a genuine BV identity is actionable. No aid conversion, URL or CID handoff.
        let item: VodItem | undefined;
        try {
          const entryBvid = vodBvid(episode.bvid), arc = record(episode.arc);
          const durationMs = vodInteger(arc.duration, 1, 86400) * 1000;
          if (seen.has(entryBvid)) throw new DomainError('invalid');
          item = { bvid: entryBvid, part: 1, title: entryTitle, durationMs };
          seen.add(entryBvid);
        } catch { /* Deleted/unavailable collection entries stay visible but cannot be played. */ }
        entries.push({ title: entryTitle, ...(item ? { item } : {}) });
      }
    }
    summary.collection = { title: caption(season.title, 120), entries };
  }
  return { summary, parts, guestAllowed };
}
export function resolveVodPart(detail: PrivateVodDetail, part: number): PrivateVodPart {
  vodInteger(part, 1, 10000);
  const found = detail.parts.find(p => p.item.part === part);
  if (!found) throw new DomainError('invalid');
  return { cid: found.cid, item: { ...found.item } };
}
function codecKind(codec: string, kind: 'video'): VideoCodec;
function codecKind(codec: string, kind: 'audio'): AudioCodec;
function codecKind(codec: string, kind: 'video' | 'audio'): VideoCodec | AudioCodec {
  if (kind === 'video') {
    if (/^avc1\.[a-fA-F0-9]{6}$/.test(codec)) return 'avc';
    if (/^(?:hev1|hvc1)\.[A-Za-z0-9.]{1,58}$/.test(codec)) return 'hevc';
    if (/^av01\.[A-Za-z0-9.]{1,58}$/.test(codec)) return 'av1';
  } else {
    if (codec === 'mp4a.40.2') return 'aac';
    if (codec === 'ec-3') return 'eac3';
    if (codec === 'fLaC') return 'flac';
  }
  throw new GuestVideoError('unsupported');
}
function frameRate(value: unknown): number {
  if (typeof value !== 'string' || !/^[0-9]{1,6}(?:\/[0-9]{1,6}|\.[0-9]{1,6})?$/.test(value)) throw new DomainError('invalid');
  const parts = value.split('/'), rate = Number(parts[0]) / (parts.length === 2 ? Number(parts[1]) : 1);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 240) throw new DomainError('invalid');
  return rate;
}
function source(raw: unknown, kind: 'video' | 'audio', now: number): PrivateVodTrack {
  const t = record(raw), codec = text(t.codecs, 64);
  if (t.mimeType !== `${kind}/mp4` && t.mime_type !== `${kind}/mp4`) throw new GuestVideoError('unsupported');
  if (t.drm_tech_type || t.drm || t.content_protection) throw new GuestVideoError('unsupported');
  if (kind === 'video') codecKind(codec, 'video'); else codecKind(codec, 'audio');
  const backup = t.backupUrl ?? t.backup_url ?? [];
  if (!Array.isArray(backup) || backup.length > 4) throw new DomainError('invalid');
  let cdn: ReturnType<typeof guestCdnUrl> | undefined, expired = false;
  for (const value of [t.baseUrl ?? t.base_url, ...backup]) {
    try { cdn = guestCdnUrl(value, now); break; }
    catch (error) { expired ||= error instanceof GuestVideoError && error.reason === 'expired_source'; }
  }
  if (!cdn) throw new GuestVideoError(expired ? 'expired_source' : 'cdn_unavailable');
  const s = record(t.SegmentBase ?? t.segment_base);
  const initialization = text(s.Initialization ?? s.initialization, 32), indexRange = text(s.indexRange ?? s.index_range, 32);
  const init = /^0-([0-9]{1,8})$/.exec(initialization), index = /^([0-9]{1,8})-([0-9]{1,8})$/.exec(indexRange);
  if (!init || !index || Number(init[1]) < 8 || Number(index[1]) !== Number(init[1]) + 1 || Number(index[2]) < Number(index[1]) || Number(index[2]) > 16777216) throw new DomainError('invalid');
  return { url: cdn.url, expiresAt: cdn.expiresAt, codec, bandwidth: vodInteger(t.bandwidth, 1, kind === 'video' ? 200000000 : 16000000), initialization, indexRange,
    ...(kind === 'video' ? { width: vodInteger(t.width, 1, 16384), height: vodInteger(t.height, 1, 8640) } : {}) };
}
export function parseVodPlayback(raw: string, part: PrivateVodPart, catalogId: string, now = Date.now()): PrivateVodCatalog {
  if (!/^[a-f0-9]{32}$/.test(catalogId) || !Number.isSafeInteger(now) || now < 1) throw new DomainError('invalid');
  const d = data(raw), dash = record(d.dash);
  if (d.is_preview || d.drm_tech_type || d.durl) throw new GuestVideoError('unsupported');
  if (!Array.isArray(dash.video) || !dash.video.length || dash.video.length > 256 || !Array.isArray(dash.audio) || dash.audio.length > 64) throw new DomainError('invalid');
  const durationMs = vodInteger(d.timelength, 1, 86400000), dashDuration = dash.duration;
  if (typeof dashDuration !== 'number' || !Number.isFinite(dashDuration) || Math.abs(dashDuration * 1000 - durationMs) > 3000 || Math.abs(durationMs - part.item.durationMs) > 3000) throw new GuestVideoError('duration_mismatch');
  const formats = d.support_formats;
  if (formats !== undefined && (!Array.isArray(formats) || formats.length > 128)) throw new DomainError('invalid');
  const videos: VodCatalog['videos'] = [], video: PrivateVodTrack[] = [];
  for (const rawTrack of dash.video) {
    const t = record(rawTrack);
    try {
      const parsed = source(t, 'video', now), codec = codecKind(parsed.codec, 'video'), quality = vodInteger(t.id, 1, 127);
      const format = (formats as unknown[] | undefined)?.map(record).find(f => f.quality === quality);
      const label = format?.new_description ?? format?.description;
      videos.push({ key: `v${video.length}`, quality, label: label === undefined ? `画质 ${quality}` : caption(label, 64), codec,
        width: parsed.width!, height: parsed.height!, fps: frameRate(t.frameRate ?? t.frame_rate), bandwidth: parsed.bandwidth });
      video.push(parsed);
    } catch (error) {
      if (!(error instanceof GuestVideoError) || error.reason !== 'unsupported') throw error;
    }
  }
  const rawAudios = [...dash.audio];
  if (dash.dolby !== undefined && dash.dolby !== null) {
    const dolby = record(dash.dolby);
    if (dolby.audio !== null && dolby.audio !== undefined) {
      if (!Array.isArray(dolby.audio)) throw new DomainError('invalid');
      rawAudios.push(...dolby.audio);
    }
  }
  if (dash.flac !== undefined && dash.flac !== null) {
    const flac = record(dash.flac);
    if (flac.audio !== undefined && flac.audio !== null) rawAudios.push(flac.audio);
  }
  if (rawAudios.length > 64) throw new DomainError('invalid');
  const audio: PrivateVodTrack[] = [], audios: VodCatalog['audios'] = [];
  for (const rawTrack of rawAudios) {
    try {
      const parsed = source(rawTrack, 'audio', now), codec = codecKind(parsed.codec, 'audio');
      audios.push({ key: `a${audio.length}`, label: `${codec.toUpperCase()} · ${Math.round(parsed.bandwidth / 1000)} kbps`, codec, bandwidth: parsed.bandwidth });
      audio.push(parsed);
    } catch (error) {
      if (!(error instanceof GuestVideoError) || error.reason !== 'unsupported') throw error;
    }
  }
  if (!videos.length || !audios.length) throw new GuestVideoError('unsupported');
  const summary = parseVodCatalog({ id: catalogId, item: { ...part.item, durationMs }, videos, audios });
  return { summary, cid: part.cid, durationMs, video, audio };
}
/** Private selection independent of URL freshness. A source owner must refresh
 * an expired selection before inspecting or offering it to the bridge. */
export function resolveVodTracks(catalog: PrivateVodCatalog, value: unknown, capabilities: VodCapabilities): PrivateVodPlan {
  const choice = parseVodChoice(value);
  if (!vodChoiceSupported(catalog.summary, choice, capabilities)) throw new GuestVideoError('unsupported');
  const video = catalog.video[Number(choice.videoKey.slice(1))], audio = catalog.audio[Number(choice.audioKey.slice(1))];
  if (!video || !audio) throw new DomainError('invalid');
  const expiresAt = Math.min(video.expiresAt, audio.expiresAt);
  return { item: { ...catalog.summary.item }, durationMs: catalog.durationMs, video: { ...video }, audio: { ...audio }, expiresAt };
}
export function selectVodPlan(catalog: PrivateVodCatalog, value: unknown, capabilities: VodCapabilities, now = Date.now()): PrivateVodPlan {
  const plan = resolveVodTracks(catalog, value, capabilities);
  if (plan.expiresAt < now + 60000) throw new GuestVideoError('expired_source');
  return plan;
}
