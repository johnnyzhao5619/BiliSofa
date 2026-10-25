import { DomainError, boundedMessage, parsePopularResult, type PopularCard } from './index.ts';
import { parseCategoryId, type CategoryId } from './categories.ts';
import { parseSearchKeyword } from './search.ts';
export type ContentQuery = { route: 'popular' | 'ranking'; page: number; refresh?: true; }
  | { route: 'category'; page: number; categoryId: CategoryId; refresh?: true; }
  | { route: 'search'; page: number; keyword: string; };
export interface ContentPage { items: PopularCard[]; noMore: boolean; }
/** Only the public endpoint's integer status, never its message/raw response. */
export class ContentApiError extends DomainError {
  constructor(public readonly apiCode: number) {
    super('network');
    if (!Number.isInteger(apiCode) || apiCode === 0 || apiCode < -2147483648 || apiCode > 2147483647) throw new DomainError('invalid');
  }
}
/** Validated terminal code only; never a native error string or response body. */
export class PopularReadError extends DomainError {
  readonly detail: string;
  constructor(value: unknown) {
    const result = parsePopularResult(value);
    if (result.kind === 'ok' || result.kind === 'api_error') throw new DomainError('invalid');
    super(result.kind === 'cancelled' ? 'cancelled' : result.kind === 'invalid_response' ? 'invalid' : result.code === 'guest.native_unavailable' ? 'unsupported' : 'network');
    this.detail = result.code;
  }
}
/** Anonymous lane only. Identity/private routes require a separate credential owner. */
export interface ContentRuntime {
  read(query: ContentQuery, signal: AbortSignal): Promise<ContentPage>;
  close(): Promise<{ closed: boolean }>;
}
export function parseContentQuery(value: unknown): ContentQuery {
  const v=boundedMessage(value);
  if(v.route==='category'){
    if(Object.keys(v).some(k=>!['route','page','categoryId','refresh'].includes(k)) || !Number.isInteger(v.page) || Number(v.page)<1 || Number(v.page)>25 || ('refresh' in v && (v.refresh!==true || v.page!==1)))throw new DomainError('invalid');
    return {route:'category',page:v.page as number,categoryId:parseCategoryId(v.categoryId),...(v.refresh===true?{refresh:true}:{})};
  }
  if(v.route==='search'){
    if(Object.keys(v).length!==3 || Object.keys(v).some(k=>!['route','page','keyword'].includes(k)) || !Number.isInteger(v.page) || Number(v.page)<1 || Number(v.page)>25)throw new DomainError('invalid');
    return {route:'search',page:v.page as number,keyword:parseSearchKeyword(v.keyword)};
  }
  if(Object.keys(v).some(k=>!['route','page','refresh'].includes(k)) || !['popular','ranking'].includes(String(v.route)) || !Number.isInteger(v.page) || Number(v.page)<1 || Number(v.page)>25 || ('refresh' in v && (v.refresh!==true || v.page!==1))) throw new DomainError('invalid');
  return {route:v.route as 'popular'|'ranking',page:v.page as number,...(v.refresh===true?{refresh:true}:{})};
}
