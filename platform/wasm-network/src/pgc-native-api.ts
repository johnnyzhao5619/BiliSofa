import { DomainError } from '../../../packages/contracts/src/index.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { pgcId } from '../../../packages/contracts/src/pgc-season.ts';
import { vodBvid, vodInteger } from '../../../packages/contracts/src/vod-catalog.ts';
import { parsePgcSeasonBody, parsePgcPlaybackBody, pgcVodDetail, type PrivatePgcSeason } from '../../../packages/bili-client/src/pgc-season.ts';
import type { PrivateVodCatalog, PrivateVodDetail } from '../../../packages/bili-client/src/vod-catalog.ts';
import type { VodReadApi } from './vod-source-owner.ts';
import { VodNativeApi } from './vod-native-api.ts';
/** Same exact-UID nav check and native two-jar closure as UGC, with a fresh
 * season/EP/CID binding on every initial or renewed source read. */
export class PgcNativeApi extends VodNativeApi {
  season(seasonId: string, signal: AbortSignal, value?: PrivateAccount): Promise<PrivatePgcSeason> {
    pgcId(seasonId);
    return this.authorized(signal, value, async account => {
      await this.request(4, seasonId, signal); return parsePgcSeasonBody(this.json(), seasonId, !!account);
    });
  }
  catalogForSeason(seasonId: string, bvid: string, part: number, id: string, signal: AbortSignal, value?: PrivateAccount): Promise<{ detail: PrivateVodDetail; catalog: PrivateVodCatalog }> {
    pgcId(seasonId); vodBvid(bvid); vodInteger(part, 1, 1);
    if (!/^[a-f0-9]{32}$/.test(id)) throw new DomainError('invalid');
    return this.authorized(signal, value, async account => {
      await this.request(4, seasonId, signal); const season = parsePgcSeasonBody(this.json(), seasonId, !!account);
      const matches = season.episodes.filter(e => e.item.bvid === bvid && e.allowed);
      if (matches.length !== 1) throw new DomainError('permission');
      const episode = matches[0]!;
      if (account && account.expiresAt <= Date.now()) throw new DomainError('login');
      await this.request(5, `${episode.episodeId}|${episode.cid}`, signal);
      return { detail: pgcVodDetail(season, episode), catalog: parsePgcPlaybackBody(this.json(), episode, id) };
    });
  }
  /** Private adapter fixes the season, so a page cannot turn a genuine BV from
   * another season into an authorized EP/CID or arbitrary source request. */
  source(seasonId: string): VodReadApi {
    pgcId(seasonId);
    return { catalog: (bvid, part, id, signal, account) => this.catalogForSeason(seasonId, bvid, part, id, signal, account),
      inspect: (plan, signal) => this.inspect(plan, signal), close: () => this.close() };
  }
}
