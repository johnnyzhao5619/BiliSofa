import { DomainError, record } from '../../contracts/src/index.ts';
import type { AccountSummary } from '../../contracts/src/private-account.ts';
import { parsePublicWbiImages } from './search-wbi.ts';
/** Public WBI material is released only after the selected identity matches.
 * Neither account details nor the source nav JSON leave the private Worker. */
export function parseVodNav(raw: string, account?: AccountSummary): { img: string; sub: string } {
  if (new TextEncoder().encode(raw).length > 16384) throw new DomainError('invalid');
  let root: Record<string, unknown>;
  try { root = record(JSON.parse(raw)); } catch { throw new DomainError('invalid'); }
  const data = record(root.data);
  if (account) {
    if (account.expiresAt <= Date.now() || root.code !== 0 || data.isLogin !== true) throw new DomainError('login');
    const uid = typeof data.mid === 'number' && Number.isSafeInteger(data.mid) ? String(data.mid) : data.mid;
    if (uid !== account.uid) throw new DomainError('login');
  } else if (![0, -101].includes(Number(root.code)) || typeof root.code !== 'number' || data.isLogin !== false) throw new DomainError('login');
  return parsePublicWbiImages(data.wbi_img);
}
