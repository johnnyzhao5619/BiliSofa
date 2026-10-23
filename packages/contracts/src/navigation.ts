import { boundedMessage, DomainError } from './index.ts';
export type PageRoute = { page: 'home' | 'search' | 'library' | 'settings' | 'account' | 'following' | 'catalog' | 'cast' }
  | { page: 'video' | 'up' | 'pgc' | 'live'; id: string };
export interface ReturnAnchor { focusId: string; scrollTop: number; }
export function parsePageRoute(value: unknown): PageRoute {
  const v = boundedMessage(value);
  if (Object.keys(v).length === 1 && ['home', 'search', 'library', 'settings', 'account','following','catalog','cast'].includes(String(v.page))) return { page: v.page as Extract<PageRoute,{page:'home'|'search'|'library'|'settings'|'account'|'following'|'catalog'|'cast'}>['page'] };
  if (Object.keys(v).length !== 2 || typeof v.id !== 'string') throw new DomainError('invalid');
  const valid = v.page === 'video' ? /^BV[A-Za-z0-9]{10}$/.test(v.id)
    : v.page === 'pgc' ? /^(ep|ss)[1-9][0-9]{0,15}$/.test(v.id)
    : ['up', 'live'].includes(String(v.page)) && /^[1-9][0-9]{0,15}$/.test(v.id);
  if (!valid) throw new DomainError('invalid');
  return { page: v.page as 'video' | 'up' | 'pgc' | 'live', id: v.id };
}
export function parseReturnAnchor(value: unknown): ReturnAnchor {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 2 || typeof v.focusId !== 'string' || !/^[A-Za-z0-9_-]{0,96}$/.test(v.focusId) || typeof v.scrollTop !== 'number' || !Number.isFinite(v.scrollTop) || v.scrollTop < 0 || v.scrollTop > 10000000) throw new DomainError('invalid');
  return { focusId: v.focusId, scrollTop: Math.floor(v.scrollTop) };
}
