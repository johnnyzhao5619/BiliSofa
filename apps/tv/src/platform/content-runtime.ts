import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { ContentApiError, PopularReadError, parseContentQuery, type ContentRuntime, type ContentQuery, type ContentPage } from '../../../../packages/contracts/src/content.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { KernelCategoryRanking, KernelPopular, KernelRanking, KernelVideoSearch } from './public-lanes.ts';
import { SearchReadError } from '../../../../packages/contracts/src/search.ts';
import type { CategoryId } from '../../../../packages/contracts/src/categories.ts';
import { forgetPaced, pacedRead, usedVisitor } from './public-lists.ts';
import { visitorIds } from './visitor-id.ts';
/** The active account's own session for the paced public lists; absent for guests. */
export interface SignedLists { category?(categoryId: CategoryId, signal: AbortSignal): Promise<PopularCard[]>; ranking?(signal: AbortSignal): Promise<PopularCard[]>; }
/** All URLs, credentials and native calls remain behind the resident public kernel (ADR-108). */
export class PublicContentRuntime implements ContentRuntime {
  private readonly sessions = new SessionManager();
  private readonly worker = new KernelPopular();
  private readonly ranking = new KernelRanking();
  private readonly category = new KernelCategoryRanking();
  private readonly search = new KernelVideoSearch();
  private rankingSnapshot: PopularCard[] | undefined;
  private rankingKey: string | undefined;
  private closing: Promise<{closed:boolean}> | undefined;
  /** With an active account, category rankings (0.51.2, ADR-105) and the 全站排行 (0.65.0, ADR-117) use its own session. */
  constructor(private readonly signed: SignedLists = {}) {}
  async read(value: ContentQuery, signal: AbortSignal): Promise<ContentPage> {
    const query=parseContentQuery(value);
    if(this.closing || signal.aborted) throw new DomainError('cancelled');
    this.sessions.invalidate(); const task=this.sessions.begin(query.route);
    const rankingKey=query.route==='ranking'?'all':query.route==='category'?String(query.categoryId):undefined;
    if(!rankingKey || ('refresh' in query && query.refresh) || rankingKey!==this.rankingKey) this.rankingSnapshot=undefined;
    this.rankingKey=rankingKey;
    const abort=()=>{ if(this.sessions.accepts(task.scope)) this.sessions.invalidate(); };
    signal.addEventListener('abort',abort,{once:true});
    try {
      // Route replacement cancels this runtime's own transfers; the shared kernel stays (ADR-108).
      await Promise.all([this.worker.dispose(),this.ranking.dispose(),this.category.dispose(),this.search.dispose()]);
      if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
      if(query.route==='ranking'||query.route==='category'){
        if(this.rankingSnapshot){
          if(query.page>1 && (query.page-1)*4>=this.rankingSnapshot.length) throw new DomainError('invalid');
          return this.rankingPage(query.page);
        }
        if(query.page>1) throw new DomainError('invalid');
      }
      if(query.route==='category'){
        // ADR-105: paced (10 min reuse, 60 s pause after a refusal); account session when signed in.
        const categoryId=query.categoryId,signed=this.signed.category;
        const items=await pacedRead(String(categoryId),signed?'account':'guest','category',async()=>{
          if(signed) return signed(categoryId,task.signal);
          // ADR-106: anonymous reads carry B站's own visitor identity when one is (or can be) kept on this TV.
          const visitor=await visitorIds().ensure(task.scope,task.signal);
          if(task.signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
          usedVisitor(!!visitor);
          const r=await this.category.run({version:1,scope:task.scope,operation:'public-category-ranking',categoryId,...(visitor?{visitor}:{})},task.signal);
          if(r.kind==='api_error') throw new ContentApiError(r.apiCode!);
          if(r.kind!=='ok') throw new DomainError(r.kind==='cancelled'?'cancelled':r.kind==='invalid_response'?'invalid':'network');
          return r.items;
        });
        if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
        this.rankingSnapshot=items;return this.rankingPage(1);
      }
      if(query.route==='ranking'){
        // ADR-117: paced like the category lists; 刷新 drops the reused list but never the pause.
        const signed=this.signed.ranking,lane=signed?'account':'guest';
        if('refresh' in query && query.refresh){forgetPaced('all',lane);this.ranking.invalidate({version:1,scope:task.scope,operation:'public-ranking'});}
        const items=await pacedRead('all',lane,'ranking',async()=>{
          if(signed) return signed(task.signal);
          const r=await this.ranking.run({version:1,scope:task.scope,operation:'public-ranking'},task.signal);
          if(r.kind==='api_error') throw new ContentApiError(r.apiCode!);
          if(r.kind!=='ok') throw new DomainError(r.kind==='cancelled'?'cancelled':r.kind==='invalid_response'?'invalid':r.code.endsWith('.native_unavailable')?'unsupported':'network');
          return r.items;
        });
        if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
        this.rankingSnapshot=items;return this.rankingPage(1);
      }
      // 刷新 renews the shared popular snapshot; paging and returning reuse it.
      if('refresh' in query && query.refresh && query.route==='popular')this.worker.invalidate({version:1,scope:task.scope,operation:'guest-popular',page:1});
      const result=query.route==='search'
        ? await this.search.run({version:1,scope:task.scope,operation:'public-video-search',keyword:query.keyword,page:query.page},task.signal)
        : await this.worker.run({version:1,scope:task.scope,operation:'guest-popular',page:query.page},task.signal);
      if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
      if(result.kind==='api_error') throw new ContentApiError(result.apiCode!);
      if(result.operation==='public-video-search' && result.kind!=='ok')throw new SearchReadError(result);
      if(result.operation==='guest-popular' && result.kind!=='ok')throw new PopularReadError(result);
      if(result.kind!=='ok') throw new DomainError(result.kind==='cancelled'?'cancelled':result.kind==='invalid_response'?'invalid':result.code.endsWith('.native_unavailable')?'unsupported':'network');
      return {items:result.items,noMore:result.noMore};
    } finally { signal.removeEventListener('abort',abort);task.finish(); }
  }
  private rankingPage(page:number):ContentPage {
    const cards=this.rankingSnapshot!;
    // Give callers copies so display code cannot mutate the owned snapshot.
    return {items:cards.slice((page-1)*4,page*4).map(card=>({...card})),noMore:page*4>=cards.length};
  }
  close(): Promise<{closed:boolean}> {
    if(!this.closing){this.closing=Promise.resolve().then(()=>Promise.all([this.worker.dispose(),this.ranking.dispose(),this.category.dispose(),this.search.dispose()])).then(()=>({closed:true}),()=>({closed:false}));this.rankingSnapshot=undefined;this.sessions.dispose();}
    return this.closing;
  }
}
