import {publicArtwork} from './public-artwork.ts';
import {DomainError,record} from '../../contracts/src/index.ts';
import {parseRecommendationCard,RecommendationReadError,type RecommendationBatch,type RecommendationCard,type RecommendationPage} from '../../contracts/src/recommendations.ts';
/** Source-only fields never reach UI; ignores advertisements/non-VOD cards. */
export function parseRecommendationBody(raw:string,uid:string):RecommendationBatch{
 if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}const root=record(value);if(!Number.isSafeInteger(root.code))throw new DomainError('invalid');if(root.code!==0)throw new RecommendationReadError(`recommend.api_${root.code}`,root.code===-101?'login':'network');const data=record(root.data);
 const sourceUid=typeof data.mid==='number'&&Number.isSafeInteger(data.mid)?String(data.mid):data.mid;
 if(sourceUid===undefined||sourceUid===0||sourceUid==='0')throw new RecommendationReadError('recommend.account_unconfirmed','permission');if(sourceUid!==uid)throw new DomainError('login');
 if(!Array.isArray(data.item)||data.item.length>50)throw new DomainError('invalid');const items:RecommendationCard[]=[],seen=new Set<string>(),shown:string[]=[];let omitted=0;
 for(const entry of data.item){const row=record(entry);if(['av','ad','ogv_season','live'].includes(String(row.goto))){const id=typeof row.id==='number'&&Number.isSafeInteger(row.id)?String(row.id):row.id;if(typeof id==='string'&&/^[1-9][0-9]{0,19}$/.test(id))shown.push(`${row.goto}_${id}`);}
  if(row.goto!=='av'){omitted++;continue;}const owner=record(row.owner),reason=row.rcmd_reason===null||row.rcmd_reason===undefined?{}:record(row.rcmd_reason);const cover=publicArtwork(row.pic);const card=parseRecommendationCard({bvid:row.bvid,title:row.title,author:owner.name,durationSeconds:row.duration,reason:reason.content??'',...(cover?{cover}:{})});if(!seen.has(card.bvid)){seen.add(card.bvid);items.push(card);}
 }
 return {items,shown:shown.join(','),sourceCount:data.item.length,omitted};
}
/** Bounded page window; previous pages are source snapshots, never refetched. */
export class RecommendationWindow{
 private pages:RecommendationCard[][]=[];private first=1;private end=false;private omitted=0;
 get nextPage():number{return this.first+this.pages.length;}
 has(page:number):boolean{return page>=this.first&&page<this.nextPage;}
 append(batch:RecommendationBatch):void{
  const seen=new Set(this.pages.flat().map(c=>c.bvid)),novel=batch.items.filter(c=>!seen.has(c.bvid));
  if(!novel.length&&batch.sourceCount>0)throw new RecommendationReadError(batch.items.length?'recommend.repeated_batch':'recommend.no_video','invalid');
  this.omitted=batch.omitted;this.end=batch.sourceCount===0;
  for(let i=0;i<novel.length;i+=4)this.pages.push(novel.slice(i,i+4));
  while(this.pages.length>32){this.pages.shift();this.first++;}
 }
 page(page:number):RecommendationPage{if(!this.has(page)&&!(this.end&&page===this.nextPage))throw new DomainError('invalid');return {page,firstPage:this.first,items:(this.pages[page-this.first]??[]).map(c=>({...c})),noMore:this.end&&page>=this.nextPage-1,omitted:this.omitted};}
 clear():void{this.pages=[];this.first=1;this.end=false;this.omitted=0;}
}
