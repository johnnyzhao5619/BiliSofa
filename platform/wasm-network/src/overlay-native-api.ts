import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { parseOverlayCommand, parseOverlayTarget, type OverlayCommand, type OverlayTarget, type OverlayValue } from '../../../packages/contracts/src/overlay-read.ts';
import { vodInteger } from '../../../packages/contracts/src/vod-catalog.ts';
import { parseVodDetail, resolveVodPart } from '../../../packages/bili-client/src/vod-catalog.ts';
import { parsePgcSeasonBody } from '../../../packages/bili-client/src/pgc-season.ts';
import { decodeDanmakuSegment, parsePlayerMetadata, parseSubtitleBody } from '../../../packages/bili-client/src/overlay-data.ts';
import { VodNativeApi } from './vod-native-api.ts';
export class OverlayNativeApi extends VodNativeApi {
  read(rawTarget: OverlayTarget, rawCommand: OverlayCommand, signal: AbortSignal, expectedCid: string, account?: PrivateAccount): Promise<OverlayValue> {
    const target = parseOverlayTarget(rawTarget), command = parseOverlayCommand(rawCommand);
    return this.authorized(signal, account, async (identity, keys) => {
      let episodeCid: string | undefined;
      if (target.seasonId) {
        await this.request(7, target.seasonId, signal); const season = parsePgcSeasonBody(this.json(), target.seasonId, !!identity);
        const episodes = season.episodes.filter(e => e.item.bvid === target.bvid && e.allowed);
        if (episodes.length !== 1) throw new DomainError('permission'); episodeCid = episodes[0]!.cid;
      }
      await this.request(1, target.bvid, signal); const raw = this.json();
      let d: Record<string, unknown>; try { const root = record(JSON.parse(raw)); if (root.code !== 0) throw new DomainError('permission'); d = record(root.data); } catch (error) { if (error instanceof DomainError) throw error; throw new DomainError('invalid'); }
      if (d.bvid !== target.bvid) throw new DomainError('invalid'); const aid = String(vodInteger(d.aid, 1, Number.MAX_SAFE_INTEGER));
      let cid: string;
      if (episodeCid) {
        if (!Array.isArray(d.pages) || d.pages.length > 10000 || d.pages.filter(p => String(record(p).cid) === episodeCid).length !== 1) throw new DomainError('unsupported');
        cid = episodeCid;
      } else { const detail = parseVodDetail(raw, target.bvid); if (!identity && !detail.guestAllowed) throw new DomainError('permission'); cid = resolveVodPart(detail, target.part).cid; }
      if (cid !== expectedCid) throw new DomainError('cancelled');
      const signature = `${keys.img}|${keys.sub}|${Math.floor(Date.now() / 1000)}`;
      if (command.kind === 'danmaku') {
        await this.request(6, `${cid}|${aid}|${command.segment}|${signature}`, signal);
        const n = this.native, at = n._vod_body_ptr(), length = n._vod_body_length();
        try {
          if (!Number.isSafeInteger(at) || at < 0 || !Number.isSafeInteger(length) || length < 0 || length > 4194304 || at + length > n.HEAPU8.length) throw new DomainError('invalid');
          return { kind: 'danmaku', items: decodeDanmakuSegment(n.HEAPU8.subarray(at, at + length)) };
        } finally { n._vod_response_clear(); }
      }
      await this.request(4, `${target.bvid}|${cid}|${signature}`, signal);
      const metadata = parsePlayerMetadata(this.json(), { bvid: target.bvid, cid, aid });
      if (command.kind === 'metadata') return { kind: 'metadata', tracks: metadata.tracks.map(t => t.summary), loginRequired: metadata.loginRequired };
      const track = metadata.tracks.find(t => t.summary.key === command.track.key && t.summary.language === command.track.language && t.summary.label === command.track.label && t.summary.automatic === command.track.automatic);
      if (!track) throw new DomainError(metadata.loginRequired ? 'login' : 'cancelled');
      await this.request(5, track.url, signal); return { kind: 'subtitles', cues: parseSubtitleBody(this.json()) };
    });
  }
}
