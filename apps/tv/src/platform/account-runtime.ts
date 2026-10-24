import {RecommendationWindow} from '../../../../packages/bili-client/src/recommendations.ts';
import {parseRecommendationQuery,parseRecommendationRequest,parseRecommendationResult,RecommendationReadError,type RecommendationRequest,type RecommendationResult} from '../../../../packages/contracts/src/recommendations.ts';
import {DomainError,type Scope} from '../../../../packages/contracts/src/index.ts';
import {parsePrivateAccount,type PrivateAccount,type AccountRuntime} from '../../../../packages/contracts/src/private-account.ts';
import {parseWatchLaterRequest,parseWatchLaterResult,type WatchLaterRequest,type WatchLaterResult,type WatchLaterQuery,type WatchLaterPage} from '../../../../packages/contracts/src/watch-later.ts';
import {parseHistoryQuery,parseHistoryRequest,parseHistoryResult,type HistoryRequest,type HistoryResult,type HistoryCursor,type HistoryCard,type HistoryPage} from '../../../../packages/contracts/src/history.ts';
import {ScopedGuestWorker} from './scoped-guest-worker.ts';
import {parsePublicReadCommand,parsePublicReadRequest,parsePublicReadResult,type PublicReadRequest,type PublicReadResult} from '../../../../packages/contracts/src/public-read.ts';
import {identityRuntime} from './identity-worker.ts';
import {createVodAccess,createPgcAccess} from './vod-runtime.ts';
import {pgcId} from '../../../../packages/contracts/src/pgc-season.ts';
import {createLiveAccess} from './live-runtime.ts';
import {parsePgcFollowCommand,parsePgcFollowRequest,parsePgcFollowResult,type PgcFollowRequest,type PgcFollowResult} from '../../../../packages/contracts/src/pgc-follow.ts';
import {vodCandidateCapabilities} from './samsung.ts';
import {parseFollowUpdatesQuery,parseFollowUpdatesRequest,parseFollowUpdatesResult,type FollowUpdate,type FollowUpdatesPage,type FollowUpdatesRequest,type FollowUpdatesResult} from '../../../../packages/contracts/src/follow-updates.ts';
import {parseFavoriteFoldersQuery,parseFavoriteItemsQuery,parseFavoriteRequest,parseFavoriteResult,type PrivateFavoriteFolder,type FavoriteRequest,type FavoriteResult,type FavoriteFoldersPage,type FavoriteItemsPage} from '../../../../packages/contracts/src/favorites.ts';
/** All private capabilities share one native owner. Cursors/snapshots never reach UI storage. */
export function accountRuntime(account:PrivateAccount):AccountRuntime{
 let secret:PrivateAccount|undefined=parsePrivateAccount(account),closing:Promise<{closed:boolean}>|undefined,current:{dispose():Promise<void>}|undefined,generation=0,poisoned=false;
 const recommendationLifetime=new AbortController();
 const recommendations=new RecommendationWindow();let recommendationIndex=-1,recommendationBrush=0,recommendationShown='',recommendationGeneration:number|undefined;
 function recommendationRetryDelay(signal:AbortSignal,ticket:number):Promise<void>{
  return new Promise((resolve,reject)=>{let settled=false;const signals=[signal,recommendationLifetime.signal];let timer:ReturnType<typeof setTimeout>|undefined;
   const finish=(cancelled=false)=>{if(settled)return;settled=true;clearTimeout(timer);for(const s of signals)s.removeEventListener('abort',abort);if(cancelled||ticket!==generation||closing||!secret)reject(new DomainError('cancelled'));else resolve();};
   const abort=()=>finish(true);for(const s of signals)s.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish(),350);if(signals.some(s=>s.aborted))abort();
  });
 }
 const identity=identityRuntime(secret),initial=()=>({max:'0',viewAtSec:0,business:''} as const);
 let historyCursor:HistoryCursor=initial(),historyPages:HistoryCard[][]=[],historyEnded=false,historyGeneration:number|undefined;
 const seen=new Set<string>();
 let followOffset='',followPages:FollowUpdate[][]=[],followEnded=false,followGeneration:number|undefined;
 const followSeen=new Set<string>();
 function resetFollow(){followOffset='';followPages=[];followEnded=false;followGeneration=undefined;followSeen.clear();followSeen.add('');}
 let favoriteFolders:PrivateFavoriteFolder[]|undefined,favoriteTotal=0,favoriteGeneration:number|undefined,favoriteRevision=0;
 function resetFavorites(){favoriteFolders=undefined;favoriteTotal=0;favoriteGeneration=undefined;favoriteRevision++;}
 const favoriteWorker=(operation:FavoriteRequest['operation'])=>new ScopedGuestWorker<FavoriteRequest,FavoriteResult>('library-worker.js',operation,parseFavoriteRequest,parseFavoriteResult,22000,12000,(q,r)=>q.operation===r.operation&&(r.kind!=='ok'||r.operation!=='favorite-items-read'||q.operation==='favorite-items-read'&&r.page.folderKey===q.query.folderKey&&r.page.page===q.query.page));
 function resetHistory(){historyCursor=initial();historyPages=[];historyEnded=false;seen.clear();seen.add(JSON.stringify(historyCursor));}
 async function acquire(scope:Scope,signal:AbortSignal){
  if(!secret||closing||signal.aborted)throw new DomainError('cancelled');if(scope.accountId!==secret.id)throw new DomainError('invalid');if(poisoned)throw new DomainError('unknown');const ticket=++generation,old=current;
  try{await old?.dispose();}catch{poisoned=true;throw new DomainError('unknown');}
  if(ticket!==generation||signal.aborted||!secret||closing)throw new DomainError('cancelled');return ticket;
 }
 async function run<Q extends {scope:Scope;operation:string},R extends {scope:Scope;closed?:boolean}>(worker:ScopedGuestWorker<Q,R>,query:Q,signal:AbortSignal,ticket:number):Promise<R>{
  if(ticket!==generation||!secret||closing||signal.aborted)throw new DomainError('cancelled');current=worker;
  let result!:R;
  try{result=await worker.run(query,signal);}
  finally{try{await worker.dispose();}catch{poisoned=true;throw new DomainError('unknown');}finally{if(current===worker)current=undefined;}}
  if(ticket!==generation||signal.aborted||closing)throw new DomainError('cancelled');return result;
 }
 return {
  verify:signal=>identity.verify(signal),
  async clearReadCaches(scope,signal){
   await acquire(scope,signal);recommendations.clear();recommendationIndex=-1;recommendationBrush=0;recommendationShown='';recommendationGeneration=undefined;
   resetHistory();historyGeneration=undefined;resetFavorites();resetFollow();return {cleared:true};
  },
  async readRecommendations(value,scope,signal){
   const query=parseRecommendationQuery(value),ticket=await acquire(scope,signal);
   const fresh=!!query.refresh||recommendationGeneration!==scope.generation;
   if(fresh){recommendations.clear();recommendationShown='';recommendationGeneration=scope.generation;}
   if(!recommendations.has(query.page)){
    if(query.page!==recommendations.nextPage)throw new DomainError('invalid');
    const index=recommendationIndex+1,brush=recommendationBrush+(query.refresh?1:0);if(index>1000000||brush>1000000)throw new DomainError('invalid');
    for(let attempt=0;attempt<2;attempt++){
     const worker=new ScopedGuestWorker<RecommendationRequest,RecommendationResult>('recommend-worker.js','recommendations-read',parseRecommendationRequest,parseRecommendationResult,24000,12000);
     const result=await run<RecommendationRequest,RecommendationResult>(worker,{version:1,operation:'recommendations-read',scope,account:secret!,index,freshType:query.refresh?5:index===0?0:4,brush,shown:recommendationShown},signal,ticket);
     // run has already awaited native closure. Only one unanswered safe-GET
     // timeout can retry; HTTP/API/identity/invalid/unknown results never do.
     if(result.kind==='error'){
      if(attempt===0&&result.code==='network'&&result.detail==='recommend.transport_28'){await recommendationRetryDelay(signal,ticket);continue;}
      throw new RecommendationReadError(result.detail,result.code);
     }
     recommendations.append(result.batch);recommendationIndex=index;recommendationBrush=brush;recommendationShown=result.batch.shown;break;
    }
   }
   return recommendations.page(query.page);
  },
  async openLive(media,scope,signal){
   if(typeof media!=='boolean')throw new DomainError('invalid');const ticket=await acquire(scope,signal),caps=media?vodCandidateCapabilities():undefined;
   if(media&&!caps)throw new DomainError('unsupported');if(ticket!==generation||!secret||closing||signal.aborted)throw new DomainError('cancelled');
   const live=createLiveAccess(caps,secret);current={dispose:()=>live.close()};return live;
  },
  async pgcFollow(command,scope,signal){
   const parsed=parsePgcFollowCommand(command),ticket=await acquire(scope,signal);
   const worker=new ScopedGuestWorker<PgcFollowRequest,PgcFollowResult>('pgc-follow-worker.js','pgc-follow',parsePgcFollowRequest,parsePgcFollowResult,40000,12000,(q,r)=>r.kind!=='ok'||r.value.kind===q.command.kind&&(q.command.kind!=='list'||r.value.kind==='list'&&r.value.page.page===q.command.query.page&&r.value.page.type===q.command.query.type));
   const result=await run<PgcFollowRequest,PgcFollowResult>(worker,{version:1,operation:'pgc-follow',scope,account:secret!,command:parsed},signal,ticket);
   if(result.kind==='error')throw new DomainError(result.code);return result.value;
  },
  async openVod(scope,signal){
   const ticket=await acquire(scope,signal),caps=vodCandidateCapabilities();
   if(!caps)throw new DomainError('unsupported');
   if(ticket!==generation||!secret||closing||signal.aborted)throw new DomainError('cancelled');
   const vod=createVodAccess(caps,secret);current={dispose:()=>vod.close()};return vod;
  },
  async openPgc(seasonId,scope,signal){
   pgcId(seasonId);const ticket=await acquire(scope,signal),caps=vodCandidateCapabilities();
   if(!caps)throw new DomainError('unsupported');
   if(ticket!==generation||!secret||closing||signal.aborted)throw new DomainError('cancelled');
   const pgc=createPgcAccess(caps,seasonId,secret);current={dispose:()=>pgc.close()};return pgc;
  },
  async readFollowUpdates(value,scope,signal):Promise<FollowUpdatesPage>{
   const query=parseFollowUpdatesQuery(value),ticket=await acquire(scope,signal);if(query.refresh||followGeneration!==scope.generation){resetFollow();followGeneration=scope.generation;}
   if(query.page>followPages.length+1)throw new DomainError('invalid');
   if(query.page>followPages.length&&!followEnded){
    const worker=new ScopedGuestWorker<FollowUpdatesRequest,FollowUpdatesResult>('library-worker.js','follow-updates-read',parseFollowUpdatesRequest,parseFollowUpdatesResult,22000,12000);
    const result=await run<FollowUpdatesRequest,FollowUpdatesResult>(worker,{version:1,operation:'follow-updates-read',scope,account:secret!,offset:followOffset},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);
    if(result.batch.next!==undefined){if(followSeen.has(result.batch.next))throw new DomainError('invalid');followSeen.add(result.batch.next);followOffset=result.batch.next;}else followEnded=true;
    for(let i=0;i<result.batch.items.length&&followPages.length<25;i+=4)followPages.push(result.batch.items.slice(i,i+4));
   }
   if(ticket!==generation||signal.aborted||closing)throw new DomainError('cancelled');
   return {page:query.page,items:(followPages[query.page-1]??[]).map(c=>({...c})),noMore:followEnded&&query.page>=followPages.length};
  },
  async readFavoriteFolders(value,scope,signal):Promise<FavoriteFoldersPage>{
   const query=parseFavoriteFoldersQuery(value),ticket=await acquire(scope,signal);
   if(query.refresh||favoriteGeneration!==scope.generation)resetFavorites();
   if(!favoriteFolders){const result=await run<FavoriteRequest,FavoriteResult>(favoriteWorker('favorite-folders-read'),{version:1,operation:'favorite-folders-read',scope,account:secret!},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);if(result.operation!=='favorite-folders-read')throw new DomainError('invalid');favoriteFolders=result.batch.items;favoriteTotal=result.batch.total;favoriteGeneration=scope.generation;}
   if(ticket!==generation||signal.aborted||closing)throw new DomainError('cancelled');
   return {page:query.page,total:favoriteTotal,complete:favoriteFolders.length===favoriteTotal,noMore:query.page*4>=favoriteFolders.length,items:favoriteFolders.slice((query.page-1)*4,query.page*4).map((c,i)=>({key:`f${favoriteRevision}_${(query.page-1)*4+i}`,title:c.title,count:c.count}))};
  },
  async readFavoriteItems(value,scope,signal):Promise<FavoriteItemsPage>{
   const query=parseFavoriteItemsQuery(value),ticket=await acquire(scope,signal),match=/^f([1-9][0-9]*)_([0-9]+)$/.exec(query.folderKey);
   if(!match||Number(match[1])!==favoriteRevision||favoriteGeneration!==scope.generation||!favoriteFolders)throw new DomainError('invalid');const folder=favoriteFolders[Number(match[2])];if(!folder)throw new DomainError('invalid');
   const result=await run<FavoriteRequest,FavoriteResult>(favoriteWorker('favorite-items-read'),{version:1,operation:'favorite-items-read',scope,account:secret!,folderId:folder.id,query},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);if(result.operation!=='favorite-items-read')throw new DomainError('invalid');return result.page;
  },
  /** ADR-105: one public list with this session (read-only); refusals return B站's code, never a retry. */
  async readPublic(value,scope,signal):Promise<PublicReadResult>{
   const command=parsePublicReadCommand(value),ticket=await acquire(scope,signal),worker=new ScopedGuestWorker<PublicReadRequest,PublicReadResult>('public-read-worker.js','public-read',parsePublicReadRequest,parsePublicReadResult,22000,12000);
   const result=await run<PublicReadRequest,PublicReadResult>(worker,{version:1,operation:'public-read',scope,command,account:secret!},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);return result;
  },
  async readWatchLater(query:WatchLaterQuery,scope:Scope,signal:AbortSignal):Promise<WatchLaterPage>{
   const ticket=await acquire(scope,signal),worker=new ScopedGuestWorker<WatchLaterRequest,WatchLaterResult>('library-worker.js','watch-later-read',parseWatchLaterRequest,parseWatchLaterResult,22000,12000,(q,r)=>r.kind!=='ok'||r.page.page===q.query.page);
   const result=await run<WatchLaterRequest,WatchLaterResult>(worker,{version:1,operation:'watch-later-read',scope,query,account:secret!},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);return result.page;
  },
  async readHistory(value,scope,signal):Promise<HistoryPage>{
   const query=parseHistoryQuery(value),ticket=await acquire(scope,signal);
   if(query.refresh||historyGeneration!==scope.generation){resetHistory();historyGeneration=scope.generation;}
   if(query.page>historyPages.length+1)throw new DomainError('invalid');
   if(query.page>historyPages.length&&!historyEnded){
    const worker=new ScopedGuestWorker<HistoryRequest,HistoryResult>('library-worker.js','history-read',parseHistoryRequest,parseHistoryResult,22000,12000);
    const result=await run<HistoryRequest,HistoryResult>(worker,{version:1,operation:'history-read',scope,account:secret!,cursor:historyCursor},signal,ticket);if(result.kind==='error')throw new DomainError(result.code);
    if(result.batch.next){const key=JSON.stringify(result.batch.next);if(seen.has(key))throw new DomainError('invalid');seen.add(key);historyCursor=result.batch.next;}else historyEnded=true;
    for(let i=0;i<result.batch.items.length&&historyPages.length<25;i+=4)historyPages.push(result.batch.items.slice(i,i+4));
   }
   if(ticket!==generation||signal.aborted||closing)throw new DomainError('cancelled');
   return {page:query.page,items:(historyPages[query.page-1]??[]).map(c=>({...c})),noMore:historyEnded&&query.page>=historyPages.length};
  },
  close(){if(!closing){secret=undefined;generation++;recommendationLifetime.abort();recommendations.clear();recommendationShown='';resetHistory();resetFavorites();resetFollow();closing=Promise.all([identity.close(),current?.dispose().then(()=>({closed:true}),()=>({closed:false}))??Promise.resolve({closed:true})]).then(results=>({closed:!poisoned&&results.every(r=>r.closed)}));}return closing;}
 };
}
