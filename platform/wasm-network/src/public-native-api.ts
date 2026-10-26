import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import type { PublicReadCommand } from '../../../packages/contracts/src/public-read.ts';
import { parseRankingBody, parseUpArchivesBody } from '../../../packages/bili-client/src/ranking.ts';
import { VodNativeApi } from './vod-native-api.ts';
/** ADR-105: the exact-identity nav check, then one fixed public read with the same signed-in session. */
export class PublicNativeApi extends VodNativeApi {
  read(command: PublicReadCommand, signal: AbortSignal, account: PrivateAccount) {
    return this.authorized(signal, account, async () => {
      if (command.kind === 'category') { await this.request(4, String(command.categoryId), signal); return { kind: 'category' as const, ...parseRankingBody(this.json()) }; }
      if (command.kind === 'ranking') { await this.request(6, 'all', signal); return { kind: 'ranking' as const, ...parseRankingBody(this.json()) }; }
      await this.request(5, `${command.mid}|${command.page}`, signal); return { kind: 'up' as const, ...parseUpArchivesBody(this.json()) };
    });
  }
}
