/** Process memory only (ADR-093): the item a viewer was watching when Home released the
 * player. Never stored, never sent; identity-bound and consumed by the first page render. */
interface ResumeEntry { identity: string; bvid: string; part: number; title: string; timeMs: number; durationMs: number; }
let owner: string | undefined, pending: ResumeEntry | undefined;
export function beginResume(identity: string): void { owner = identity; }
export function rememberResume(entry: Omit<ResumeEntry, 'identity'>): void { if (owner !== undefined) pending = { ...entry, identity: owner }; }
export function forgetResume(): void { pending = undefined; }
export function takeResume(identity: string): Omit<ResumeEntry, 'identity'> | undefined {
  const entry = pending; pending = undefined;
  if (!entry || entry.identity !== identity) return undefined;
  const { identity: _, ...rest } = entry; return rest;
}
