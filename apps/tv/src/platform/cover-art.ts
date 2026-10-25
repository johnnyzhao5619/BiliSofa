import {parseCoverReference,type CoverReference} from '../../../../packages/contracts/src/index.ts';
import {COVER_LIMITS} from '../../../../packages/contracts/src/content-presentation.ts';
import {coverImage} from '../../../../packages/contracts/src/cover-image.ts';
type Entry={key:string;controller:AbortController;refs:number;promise:Promise<string|undefined>;resolve:(url:string|undefined)=>void;url?:string;bytes:number;pixels:number;expires:number;running:boolean;};
const entries=new Map<string,Entry>(),queue:Entry[]=[];let active=0;
// ADR-109: idle covers outlive the page that showed them (LRU: 160 idle, 24 MB, 10 min), so returning to a page shows them at once.
const TTL=600000,MAX_ENTRIES=200,MAX_IDLE=160,MAX_BYTES=24*1024*1024,MAX_PIXELS=MAX_IDLE*480*270,PARALLEL=4;
function remove(e:Entry){if(entries.get(e.key)===e)entries.delete(e.key);const at=queue.indexOf(e);if(at>=0)queue.splice(at,1);e.controller.abort();if(e.url)URL.revokeObjectURL(e.url);e.resolve(undefined);}
function trim(){const idle=[...entries.values()].filter(e=>e.refs===0&&!e.running);let bytes=0,pixels=0;for(const e of entries.values()){bytes+=e.bytes;pixels+=e.pixels;}while(idle.length&&(idle.length>MAX_IDLE||entries.size>=MAX_ENTRIES||bytes>MAX_BYTES||pixels>MAX_PIXELS||idle[0]!.expires<performance.now())){const e=idle.shift()!;bytes-=e.bytes;pixels-=e.pixels;remove(e);}}
function pump(){while(active<PARALLEL&&queue.length){const e=queue.shift()!;if(!e.refs){remove(e);continue;}active++;e.running=true;void read(e).then(result=>{if(e.controller.signal.aborted){if(result)URL.revokeObjectURL(result.url);return;}if(result){e.url=result.url;e.bytes=result.bytes;e.pixels=result.pixels;e.expires=performance.now()+TTL;e.resolve(result.url);}else{entries.delete(e.key);e.resolve(undefined);}}).finally(()=>{e.running=false;active--;trim();pump();});}}
async function read(e:Entry):Promise<{url:string;bytes:number;pixels:number}|undefined>{
 const abort=e.controller.signal;
 for(let attempt=0;attempt<2&&!abort.aborted;attempt++){
  const controller=new AbortController(),cancel=()=>controller.abort();abort.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,8000);let input:string|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,retry=false;
  try{
   const response=await fetch(e.key,{signal:controller.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',mode:'cors',cache:'default'});
   if(!response.ok){retry=response.status>=500||response.status===429;throw Error();}
   const mime=(response.headers.get('content-type')??'').split(';')[0]!.trim().toLowerCase();if(!response.body||!['image/png','image/jpeg','image/webp'].includes(mime)||Number(response.headers.get('content-length'))>COVER_LIMITS.bytes)throw Error();
   reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
   for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>COVER_LIMITS.bytes)throw Error();chunks.push(part.value);}
   const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}const dimensions=coverImage(data,mime);if(controller.signal.aborted)throw Error();
   input=URL.createObjectURL(new Blob([data],{type:mime}));const image=new Image();
   await new Promise<void>((yes,no)=>{const finish=(ok:boolean)=>{controller.signal.removeEventListener('abort',cancelled);image.onload=image.onerror=null;ok?yes():no(Error());};const cancelled=()=>{image.src='';finish(false);};image.onload=()=>finish(true);image.onerror=()=>finish(false);controller.signal.addEventListener('abort',cancelled,{once:true});if(controller.signal.aborted)cancelled();else image.src=input!;});
   if(image.naturalWidth!==dimensions.width||image.naturalHeight!==dimensions.height||controller.signal.aborted)throw Error();const scale=Math.min(1,480/dimensions.width,270/dimensions.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(dimensions.width*scale));canvas.height=Math.max(1,Math.round(dimensions.height*scale));const pixels=canvas.width*canvas.height,context=canvas.getContext('2d');if(!context)throw Error();context.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob|null>(yes=>canvas.toBlob(yes,'image/jpeg',.85));canvas.width=canvas.height=0;image.src='';if(!blob||controller.signal.aborted)throw Error();return{url:URL.createObjectURL(blob),bytes:blob.size,pixels};
  }catch(error){retry ||= error instanceof TypeError||controller.signal.aborted&&!abort.aborted;}
  finally{clearTimeout(timer);abort.removeEventListener('abort',cancel);controller.abort();void reader?.cancel().catch(()=>{});if(input)URL.revokeObjectURL(input);}
  if(!retry||attempt||abort.aborted)break;
  await new Promise<void>(resolve=>{const stop=()=>{clearTimeout(timer);abort.removeEventListener('abort',stop);resolve();};const timer=setTimeout(stop,200);abort.addEventListener('abort',stop,{once:true});if(abort.aborted)stop();});
 }
 return undefined;
}
/** Drops every idle cover (设置 → 清除读取缓存); covers on screen stay until their view closes. */
export function clearCovers():void{for(const e of [...entries.values()])if(e.refs===0&&!e.running)remove(e);}
/** Public-only deduplicated thumbnails. View leases pin URLs; unreferenced LRU
 * entries are bounded. Visible demand is queued, never dropped at 16 requests. */
export class CoverArt{
 private closed=false;private held=new Map<string,Entry>();private observers=new Set<IntersectionObserver>();private cleanups:(()=>void)[]=[];
 load(reference:CoverReference):Promise<string|undefined>{
  if(this.closed)return Promise.resolve(undefined);let ref:CoverReference;try{ref=parseCoverReference(reference);}catch{return Promise.resolve(undefined);}const key=`https://${ref.host}${ref.path}@480w_270h_1c.webp`;
  const held=this.held.get(key);if(held&&!held.controller.signal.aborted&&entries.get(key)===held)return held.promise;
  let e=entries.get(key);if(e&&e.refs===0&&e.expires<performance.now()){remove(e);e=undefined;}trim();
  if(!e){if(entries.size>=MAX_ENTRIES)return Promise.resolve(undefined);let resolve!:(value:string|undefined)=>void;const promise=new Promise<string|undefined>(r=>{resolve=r;});e={key,controller:new AbortController(),refs:0,promise,resolve,bytes:0,pixels:0,expires:performance.now()+TTL,running:false};entries.set(key,e);queue.push(e);}
  if(held&&held!==e)held.refs=Math.max(0,held.refs-1);e.refs++;this.held.set(key,e);entries.delete(key);entries.set(key,e);pump();return e.promise;
 }
 attach(reference:CoverReference,target:HTMLElement,signal:AbortSignal,apply:(url:string)=>void):void{
  let done=false,loading=false,last=-Infinity;let observer:IntersectionObserver|undefined;
  const start=()=>{if(done||loading||this.closed||signal.aborted||!target.isConnected||performance.now()-last<5000)return;loading=true;last=performance.now();void this.load(reference).then(url=>{loading=false;if(!url||this.closed||signal.aborted)return;done=true;observer?.disconnect();if(observer)this.observers.delete(observer);target.removeEventListener('focusin',start);apply(url);});};
  if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(rows=>{if(rows.some(row=>row.isIntersecting))start();},{rootMargin:'300px'});this.observers.add(observer);observer.observe(target);}else queueMicrotask(start);
  target.addEventListener('focusin',start);this.cleanups.push(()=>target.removeEventListener('focusin',start));
 }
 close():void{if(this.closed)return;this.closed=true;for(const observer of this.observers)observer.disconnect();this.observers.clear();for(const fn of this.cleanups)fn();this.cleanups=[];for(const e of this.held.values()){e.refs=Math.max(0,e.refs-1);if(!e.refs&&!e.url)remove(e);}this.held.clear();trim();pump();}
}
