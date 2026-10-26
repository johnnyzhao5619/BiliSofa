import { DomainError, record } from './index.ts';
import { vodBvid, vodInteger, vodKeys } from './vod-catalog.ts';
/** Only the private source-Worker to overlay/comments-Worker MessagePort may carry CID (and, with ADR-112,
 * the AID and the WBI salts that the playback read already verified). The three extras come together or not at all. */
export interface PrivateOverlayBinding { version: 1; kind: 'overlay-binding'; bvid: string; part: number; cid: string; aid?: string; img?: string; sub?: string; }
const id = (value: unknown) => { if (typeof value !== 'string' || !/^[1-9][0-9]{0,15}$/.test(value) || BigInt(value) > 9007199254740991n) throw new DomainError('invalid'); return value; };
const salt = (value: unknown) => { if (typeof value !== 'string' || !/^[0-9a-f]{32}$/.test(value)) throw new DomainError('invalid'); return value; };
export function parsePrivateOverlayBinding(value: unknown, target: { bvid: string; part: number }): PrivateOverlayBinding {
  const v = record(value), extra = v.aid !== undefined || v.img !== undefined || v.sub !== undefined;
  vodKeys(v, ['version', 'kind', 'bvid', 'part', 'cid', ...(extra ? ['aid', 'img', 'sub'] : [])]);
  if (v.version !== 1 || v.kind !== 'overlay-binding' || v.bvid !== target.bvid || v.part !== target.part) throw new DomainError('invalid');
  return { version: 1, kind: 'overlay-binding', bvid: vodBvid(v.bvid), part: vodInteger(v.part, 1, 10000), cid: id(v.cid), ...(extra ? { aid: id(v.aid), img: salt(v.img), sub: salt(v.sub) } : {}) };
}
/** ADR-112: a binding that lets an overlay or comments read skip nav/view. */
export function boundVideo(binding: PrivateOverlayBinding | undefined): { cid: string; aid: string; keys: { img: string; sub: string } } | undefined {
  return binding?.aid && binding.img && binding.sub ? { cid: binding.cid, aid: binding.aid, keys: { img: binding.img, sub: binding.sub } } : undefined;
}
