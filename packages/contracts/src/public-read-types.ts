import type { Scope, ErrorCode, PopularCard } from './index.ts';
import type { CategoryId } from './categories.ts';
import type { UpArchiveCard } from './up-archives.ts';
/** Public lists read with the viewer's own signed-in session (read-only GET; the session never leaves the Worker lane). */
export type PublicReadCommand = { kind: 'category'; categoryId: CategoryId } | { kind: 'up'; mid: string; page: number };
export type PublicReadResult = { version: 1; operation: 'public-read'; scope: Scope; closed: true } & (
  | { kind: 'category'; items: PopularCard[] }
  | { kind: 'up'; archives: UpArchiveCard[]; total: number }
  /** B站 answered with a non-zero code (e.g. -352 risk control) or an HTTP status; fixed integers only. */
  | { kind: 'refused'; apiCode?: number; http?: number }
  | { kind: 'error'; code: ErrorCode });
