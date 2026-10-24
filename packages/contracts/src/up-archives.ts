import { DomainError, finite, record, text, parseCoverReference, type CoverReference } from './index.ts';
declare const BILISOFA_PRODUCT_UP:boolean;
/** 0.51.0 UP主页·投稿 (ADR-103); older variants keep their frozen behaviour. */
export const PRODUCT_UP=typeof BILISOFA_PRODUCT_UP!=='undefined'&&BILISOFA_PRODUCT_UP;
/** Official web series search with empty keywords: newest first, fixed 30 per page, at most 50 pages. */
export const UP_ARCHIVE_PAGE=30, UP_ARCHIVE_PAGES=50;
/** One public upload of an UP; the page supplies the owner name it already shows. */
export interface UpArchiveCard { bvid: string; title: string; durationSec: number; views: number; publishedAt?: number; cover?: CoverReference; }
export function upMid(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,15}$/.test(value) || BigInt(value) > 9007199254740991n) throw new DomainError('invalid');
  return value;
}
export function upPage(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > UP_ARCHIVE_PAGES) throw new DomainError('invalid');
  return value as number;
}
export function parseUpArchiveCard(value: unknown): UpArchiveCard {
  const v = record(value);
  if (Object.keys(v).some(k => !['bvid', 'title', 'durationSec', 'views', 'publishedAt', 'cover'].includes(k))) throw new DomainError('invalid');
  const bvid = text(v.bvid, 12), durationSec = finite(v.durationSec, 0, 86400), views = finite(v.views, 0, Number.MAX_SAFE_INTEGER);
  if (!/^BV[A-Za-z0-9]{10}$/.test(bvid) || !Number.isInteger(durationSec) || !Number.isInteger(views)) throw new DomainError('invalid');
  if (v.publishedAt !== undefined && (!Number.isSafeInteger(v.publishedAt) || (v.publishedAt as number) < 1 || (v.publishedAt as number) >= 4102444800)) throw new DomainError('invalid');
  return { bvid, title: text(v.title, 120), durationSec, views, ...(v.publishedAt === undefined ? {} : { publishedAt: v.publishedAt as number }), ...(v.cover === undefined ? {} : { cover: parseCoverReference(v.cover) }) };
}
declare const BILISOFA_UP_FIX:boolean;
/** 0.51.1 (ADR-104): catalog reads carry the TV web runtime's own User-Agent; every video entry opens the shared detail page. */
export const UP_FIX=typeof BILISOFA_UP_FIX!=='undefined'&&BILISOFA_UP_FIX;
/** The runtime User-Agent may cross into native only as printable ASCII of bounded length (no CR/LF header injection). */
export function runtimeUserAgent(value: unknown): string | undefined {
  return typeof value === 'string' && value.length >= 8 && value.length <= 400 && /^[\x20-\x7e]+$/.test(value) ? value : undefined;
}
