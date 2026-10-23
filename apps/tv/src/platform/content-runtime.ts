import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { ContentApiError, PopularReadError, parseContentQuery, type ContentRuntime, type ContentQuery, type ContentPage } from '../../../../packages/contracts/src/content.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { PopularWorker } from './popular-worker.ts';
import { CategoryRankingWorker, RankingWorker } from './ranking-worker.ts';
import { SearchWorker } from './search-worker.ts';
import { SearchReadError } from '../../../../packages/contracts/src/search.ts';
/** All URLs, credentials and native calls remain behind the existing Worker. */
export class PublicContentRuntime implements ContentRuntime {
  private readonly sessions = new SessionManager();
  private readonly worker = new PopularWorker();
  private readonly ranking = new RankingWorker();
  private readonly category = new CategoryRankingWorker();
  private readonly search = new SearchWorker();
  private rankingSnapshot: PopularCard[] | undefined;
  private rankingKey: string | undefined;
  private closing: Promise<{closed:boolean}> | undefined;
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
      // Route replacement and cached pages wait for all native owners. A failed
      // close poisons the lane instead of overlapping an unconfirmed old read.
      await Promise.all([this.worker.dispose(),this.ranking.dispose(),this.category.dispose(),this.search.dispose()]);
      if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
      if(query.route==='ranking'||query.route==='category'){
        if(this.rankingSnapshot){
          if(query.page>1 && (query.page-1)*4>=this.rankingSnapshot.length) throw new DomainError('invalid');
          return this.rankingPage(query.page);
        }
        if(query.page>1) throw new DomainError('invalid');
      }
      const result=query.route==='search'
        ? await this.search.run({version:1,scope:task.scope,operation:'public-video-search',keyword:query.keyword,page:query.page},task.signal)
        : query.route==='category'
        ? await this.category.run({version:1,scope:task.scope,operation:'public-category-ranking',categoryId:query.categoryId},task.signal)
        : query.route==='ranking'
        ? await this.ranking.run({version:1,scope:task.scope,operation:'public-ranking'},task.signal)
        : await this.worker.run({version:1,scope:task.scope,operation:'guest-popular',page:query.page},task.signal);
      if(signal.aborted || !this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
      if(result.kind==='api_error') throw new ContentApiError(result.apiCode!);
      if(result.operation==='public-video-search' && result.kind!=='ok')throw new SearchReadError(result);
      if(result.operation==='guest-popular' && result.kind!=='ok')throw new PopularReadError(result);
      if(result.kind!=='ok') throw new DomainError(result.kind==='cancelled'?'cancelled':result.kind==='invalid_response'?'invalid':result.code.endsWith('.native_unavailable')?'unsupported':'network');
      if(result.operation==='public-ranking'||result.operation==='public-category-ranking'){this.rankingSnapshot=result.items;return this.rankingPage(1);}
      if(result.operation==='public-pgc-ranking')throw new DomainError('invalid'); // served by PgcRankingWorker, never this lane
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
