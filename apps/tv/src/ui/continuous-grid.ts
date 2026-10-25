import type {ResourceOwner} from '../app/resource-owner.ts';
type Page={buttons:HTMLButtonElement[];release:()=>void;noMore:boolean;expiresAt:number};
const owners=new WeakMap<HTMLElement,ContinuousGrid>();
/** A bounded DOM window over the source's existing pages. No synthetic key events,
 * no second input owner. A bounded, view-owned LRU reuses detached pages on Up. */
export class ContinuousGrid{
  private pages=new Map<number,Page>();
  private cache=new Map<number,Page>();
  private readonly cacheLimit=8;private readonly cacheMs=300000;
  private extent=1;private rowStride=0;private keyValue='';private end=1;private first=1;private max=1;private noMore=true;
  private requesting=false;private failed=false;private lastFocus='';private focusVersion=0;private pending:{id:string;page:number;column:number;back:boolean}|undefined;
  constructor(private owner:ResourceOwner,private grid:HTMLElement,private options:{load(page:number):Promise<void>;restored?(page:number):void;top():string;left():string;bottom():string}){
    grid.classList.add('tv-stream-grid');owners.set(grid,this);
    const focused=()=>{this.focusVersion++;this.lastFocus=(document.activeElement as HTMLElement)?.dataset.focusId??'';this.position();this.wire();this.prefetch();};grid.addEventListener('focusin',focused);
    owner.add('continuous-grid',()=>{grid.removeEventListener('focusin',focused);owners.delete(grid);this.clear();});
  }
  private clear():void{for(const page of this.cache.values())page.release();this.cache.clear();this.pages.clear();this.pending=undefined;this.lastFocus='';this.extent=1;this.rowStride=0;this.grid.style.paddingTop='';this.grid.style.paddingBottom='';this.grid.replaceChildren();}
  reset(key:string):void{this.keyValue=key;this.clear();this.failed=false;}
  prepare(key:string,clear=false):void{if(clear||key!==this.keyValue)this.reset(key);}
  commit(key:string,page:number,buttons:HTMLButtonElement[],noMore:boolean,max:number,first=1,release=()=>{}):void{
    if(this.owner.signal.aborted){release();return;}if(key!==this.keyValue)this.reset(key);
    const old=this.cache.get(page);if(old&&old.buttons!==buttons)old.release();const entry=old?.buttons===buttons?old:{buttons,release,noMore,expiresAt:performance.now()+this.cacheMs};this.cache.delete(page);this.cache.set(page,entry);this.pages.set(page,entry);this.first=first;this.max=max;this.extent=Math.max(this.extent,page);
    this.end=Math.max(...this.pages.keys());if(page===this.end)this.noMore=noMore;
    this.failed=false;const active=document.activeElement as HTMLElement|null;
    const activeId=this.grid.contains(active)?active?.dataset.focusId:undefined;const protectedButton=activeId?active:[...this.pages.values()].flatMap(p=>p.buttons).find(b=>b.dataset.focusId===this.lastFocus);
    const pending=this.pending,canMove=pending&&pending.id===activeId;
    // Keep a contiguous window. A late prefetch is cached rather than evicting
    // a middle row when the user has already moved back towards the start.
    const pivot=canMove?pending.page:Number(protectedButton?.dataset.streamPage)||page;
    while(this.pages.size>3){const keys=[...this.pages.keys()].sort((a,b)=>a-b),head=keys[0]!,tail=keys.at(-1)!;const remove=Math.abs(head-pivot)>Math.abs(tail-pivot)?head:Math.abs(head-pivot)<Math.abs(tail-pivot)?tail:page===head?tail:head;this.pages.delete(remove);}
    // Keep only eight cached batches (32 cards/art owners), with three in DOM.
    // Visible batches are pinned; stale/distant batches release every blob once.
    for(const [number,value]of this.cache){if(this.cache.size<=this.cacheLimit)break;if(this.pages.has(number))continue;value.release();this.cache.delete(number);}
    this.grid.dataset.cachedPages=String(this.cache.size);
    this.end=Math.max(...this.pages.keys());this.noMore=this.pages.get(this.end)!.noMore;
    const seen=new Set<string>(),wanted=[...this.pages.entries()].sort(([a],[b])=>a-b).flatMap(([p,v])=>v.buttons.filter(b=>{const id=b.dataset.focusId!;if(seen.has(id))return false;seen.add(id);b.dataset.streamPage=String(p);return true;}));
    const oldTop=activeId&&active?.isConnected?active.getBoundingClientRect().top:undefined;
    for(const child of [...this.grid.children])if(!wanted.includes(child as HTMLButtonElement))child.remove();
    wanted.forEach((b,i)=>{if(this.grid.children[i]!==b)this.grid.insertBefore(b,this.grid.children[i]??null);});
    this.position();this.grid.dataset.windowPages=[...this.pages.keys()].sort((a,b)=>a-b).join(',');this.grid.setAttribute('aria-busy','false');this.wire();
    if(canMove&&pending.page===page){const available=buttons.filter(b=>!b.disabled);(available[pending.back?Math.max(0,available.length-4)+pending.column:pending.column]??available.at(-1))?.focus();}
    else if(activeId){const target=wanted.find(b=>b.dataset.focusId===activeId);if(target&&document.activeElement!==target)target.focus({preventScroll:true});if(target&&oldTop!==undefined){const scroll=this.grid.closest<HTMLElement>('#pages,.tv-library-folder');if(scroll)scroll.scrollTop+=target.getBoundingClientRect().top-oldTop;}}
    this.pending=undefined;
  }
  private position():void{
    if(!this.pages.size)return;const first=[...this.grid.querySelectorAll<HTMLButtonElement>(':scope>button')][0];
    if(first?.offsetHeight){const gap=parseFloat(getComputedStyle(this.grid).rowGap)||0;this.rowStride=first.offsetHeight+gap;}
    const rows=Math.max(0,Math.min(...this.pages.keys())-this.first);this.grid.style.paddingTop=(10+rows*this.rowStride)+'px';this.grid.style.paddingBottom=(24+Math.max(0,this.extent-Math.max(...this.pages.keys()))*this.rowStride)+'px';this.grid.dataset.virtualRows=String(rows);
  }
  failure():void{this.failed=true;this.pending=undefined;this.grid.setAttribute('aria-busy','false');}
  wire():void{
    const buttons=[...this.grid.querySelectorAll<HTMLButtonElement>(':scope>button')].filter(b=>!b.disabled);
    buttons.forEach((b,i)=>{b.dataset.left=i%4?buttons[i-1]!.dataset.focusId:this.options.left();b.dataset.right=i%4<3?buttons[i+1]?.dataset.focusId??b.dataset.focusId:b.dataset.focusId;b.dataset.up=buttons[i-4]?.dataset.focusId??this.options.top();b.dataset.down=buttons[i+4]?.dataset.focusId??(this.canNext()?b.dataset.focusId:this.options.bottom());});
  }
  private canNext():boolean{return !this.noMore&&this.end<this.max;}
  private async request(page:number):Promise<void>{if(this.requesting||this.owner.signal.aborted)return;this.requesting=true;const focusedAt=this.focusVersion;try{const hit=this.cache.get(page);if(hit&&hit.expiresAt>performance.now()){this.options.restored?.(page);this.commit(this.keyValue,page,hit.buttons,hit.noMore,this.max,this.first,hit.release);}else{this.grid.setAttribute('aria-busy','true');if(hit&&!this.pages.has(page)){hit.release();this.cache.delete(page);}await this.options.load(page);}}finally{this.requesting=false;if(!this.owner.signal.aborted){this.grid.setAttribute('aria-busy','false');if(this.focusVersion!==focusedAt)this.prefetch();}}}
  private prefetch():void{
    if(this.failed||this.requesting||!this.canNext())return;
    const buttons=[...this.grid.querySelectorAll<HTMLButtonElement>(':scope>button')],active=document.activeElement as HTMLButtonElement;
    if(buttons.indexOf(active)>=Math.max(0,buttons.length-4))queueMicrotask(()=>{if(!this.owner.signal.aborted&&!this.failed&&document.activeElement===active&&!document.querySelector('#overlays>section'))void this.request(this.end+1);});
  }
  key(event:KeyboardEvent):boolean{
    const buttons=[...this.grid.querySelectorAll<HTMLButtonElement>(':scope>button')].filter(b=>!b.disabled),active=document.activeElement as HTMLButtonElement,i=buttons.indexOf(active);if(i<0)return false;
    const down=['ArrowDown','Down'].includes(event.key)||event.keyCode===40,right=['ArrowRight','Right'].includes(event.key)||event.keyCode===39,up=['ArrowUp','Up'].includes(event.key)||event.keyCode===38;
    const start=Math.min(...this.pages.keys());const backward=up&&i<4&&start>this.first,forward=(down&&i+4>=buttons.length||right&&i===buttons.length-1)&&this.canNext();
    if(!backward&&!forward)return false;if(event.repeat&&this.failed)return true;
    this.pending={id:active.dataset.focusId!,page:backward?start-1:this.end+1,column:i%4,back:backward};this.failed=false;
    if(!this.requesting)void this.request(this.pending.page);return true;
  }
}
export function continuousGridKey(event:KeyboardEvent):boolean{const active=document.activeElement as HTMLElement|null,grid=active?.closest<HTMLElement>('.tv-stream-grid');return !!grid&&!!owners.get(grid)?.key(event);}
