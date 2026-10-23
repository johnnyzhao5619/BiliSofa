import type { ProfileStore, PartResumePoint, LocalIssue } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import { queuePart } from '../../../../packages/contracts/src/local-queue.ts';
import { clockTime } from '../ui/content-card.ts';
export interface LocalCard {
  id: string;
  title: string;
  subtitle: string;
  point: PartResumePoint;
}
export type LocalCards = {
  kind: 'ok';
  items: LocalCard[];
  total: number;
  page: number;
  noMore: boolean;
  namesUnavailable: boolean;
} | {
  kind: LocalIssue;
};
/** Resolve only a visible page from this fixed partition. No network or writes. */
export function localCards(profile: ProfileStore, queue: QueueStore, page = 1): LocalCards {
  const records = profile.bookmarks?.();
  if (!records)
    return { kind: 'unavailable' };
  if (records.kind !== 'ok')
    return records;
  const ordered = [...records.items].sort((a, b) => b.updatedAt - a.updatedAt || a.bvid.localeCompare(b.bvid) || a.part - b.part);
  const current = Math.max(1, Math.min(page, Math.max(1, Math.ceil(ordered.length / 4))));
  const known = queue.read();
  let namesUnavailable = false;
  const items = ordered.slice((current - 1) * 4, current * 4).map(point => {
    const label = profile.readLabel?.(point.bvid, point.part);
    if (label && label.kind !== 'ok')
      namesUnavailable = true;
    const text = label?.kind === 'ok' ? label.value : undefined;
    const queued = known.kind === 'ok' ? known.value.items.find(item => item.bvid === point.bvid && queuePart(item) === point.part) ?? known.value.items.find(item => item.bvid === point.bvid) : undefined;
    return { id: `resume-${point.bvid}-p${point.part}`, point, title: text?.title ?? queued?.title ?? `名称暂不可用 · ${point.bvid}`,
      subtitle: `P${point.part}${text?.partTitle && text.partTitle !== text.title ? ' · ' + text.partTitle : ''} · ${clockTime(point.timeMs / 1000)} / ${clockTime(point.durationMs / 1000)}` };
  });
  return { kind: 'ok', items, total: ordered.length, page: current, noMore: current * 4 >= ordered.length, namesUnavailable };
}
