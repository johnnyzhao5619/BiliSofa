import type {ResourceOwner} from './resource-owner.ts';
import {clockTime} from '../ui/content-card.ts';
import {productButton} from './product-frame.ts';
export const ICONS={
  play:'M7 4v16l13-8Z',pause:'M7 4h3v16H7zM14 4h3v16h-3z',previous:'M6 5v14M19 5 9 12l10 7Z',next:'M18 5v14M5 5l10 7-10 7Z',
  parts:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',danmaku:'M3 5h18v11H8l-4 3v-3H3zM7 9h6M7 12h9',subtitles:'M3 5h18v14H3zM7 11h4M13 11h4M7 15h10',
  comments:'M4 4h16v12H8l-4 4z',like:'M7 10v10H4V10zM7 10l4-7c2 0 3 1 3 3v3h5l-2 11H7',follow:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 8v6m-3-3h6',
  later:'M12 7v5l3 3M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',quality:'M3 5h18v14H3zM7 9v6M7 12h4M11 9v6M14 9h2.5a2.5 2.5 0 0 1 0 6H14z',
  rate:'M4 16a8 8 0 1 1 16 0M12 16l4-5',repeat:'M4 11V8h14l-3-3M20 13v3H6l3 3',settings:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
} as const;
/** Icon + label; the label text stays the accessible name unless data-aria-fixed keeps a stable one. */
export function decorate(button:HTMLButtonElement,path:string,iconOnly=false):void{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS(svg.namespaceURI,'path'),label=document.createElement('span');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');use.setAttribute('d',path);svg.append(use);label.className='tv-btn-label';label.textContent=button.textContent;
  button.replaceChildren(svg,label);button.classList.add('tv-icon-button');if(iconOnly)button.classList.add('tv-icon-only');if(!button.dataset.ariaFixed)button.setAttribute('aria-label',label.textContent??'');
}
export function setLabel(button:HTMLButtonElement,text:string):void{
  const label=button.querySelector<HTMLElement>('.tv-btn-label');if(!label){if(button.textContent!==text)button.textContent=text;return;}
  if(label.textContent!==text)label.textContent=text;if(!button.dataset.ariaFixed&&button.getAttribute('aria-label')!==text)button.setAttribute('aria-label',text);
}
export function setIcon(button:HTMLButtonElement,path:string):void{const use=button.querySelector('svg path');if(use&&use.getAttribute('d')!==path)use.setAttribute('d',path);}
interface Options {
  /** 0.46 product player: secondary actions open in a settings panel instead of an inline grid. */
  openSettings?(buttons:HTMLButtonElement[]):void;
  icons?:Record<string,string>;
  iconOnly?:readonly string[];
  /** ADR-113 quick settings row: Down on the main row shows these controls (by focus id) in one row; each proxy clicks
   * its original, so pickers and toggles behave exactly as in ⚙. `label` replaces the original's text. */
  quick?:readonly {id:string;label?:string;picker?:boolean;icon?:string}[];
}
interface Intent {
  preview(deltaMs:number):void;
  confirm():void;
  target():number|undefined;
  stepMs():number;
}
/** DOM-only presentation shared by VOD/queue/PGC/cast. No backend calls or key listeners. */
export class PlayerPresentation {
  private readonly seek=document.createElement('div');
  private readonly progress=document.createElement('progress');
  private readonly marker=document.createElement('span');
  private readonly badge=document.createElement('span');
  private readonly primary=document.createElement('div');
  private readonly secondary=document.createElement('div');
  private readonly more:HTMLButtonElement;
  private expanded=false;
  private readonly quickRow=document.createElement('div');
  private quickOpen=false;
  private seekable=false;
  constructor(private readonly owner:ResourceOwner,private readonly panel:HTMLElement,title:HTMLElement,private readonly timer:HTMLElement,status:HTMLElement,controls:HTMLElement,primaryIds:readonly string[],private readonly intent:Intent,private readonly lead?:HTMLElement,private readonly options:Options={}){
    panel.classList.add('tv-player');title.classList.add('tv-player-title');status.classList.add('tv-player-status');
    this.badge.className='tv-player-badge';const heading=document.createElement('div');heading.className='tv-player-heading';title.replaceWith(heading);heading.append(title,this.badge);
    this.seek.className='tv-player-seek';this.seek.dataset.focusId='player-timeline';this.seek.tabIndex=0;this.seek.setAttribute('role','slider');this.seek.setAttribute('aria-label','播放进度，左右预览，确认跳转，返回取消');
    this.progress.max=1;this.progress.value=0;this.progress.setAttribute('aria-hidden','true');this.marker.className='tv-player-marker';this.marker.hidden=true;this.seek.append(this.progress,this.marker);timer.classList.add('tv-player-time');
    // ADR-114: the time sits at the right end of the bar instead of on its own line.
    const track=document.createElement('div');track.className='tv-player-track';timer.before(track);track.append(this.seek,timer);
    this.primary.className='tv-player-primary';this.secondary.className='tv-player-secondary';this.secondary.hidden=true;this.quickRow.className='tv-player-quick';this.quickRow.hidden=true;
    const buttons=[...controls.querySelectorAll<HTMLButtonElement>(':scope>button')];
    for(const button of buttons)(primaryIds.includes(button.dataset.focusId??'')?this.primary:this.secondary).append(button);
    this.more=productButton('player-more',options.openSettings?'设置':'更多',()=>{if(owner.signal.aborted)return;if(options.openSettings){options.openSettings([...this.secondary.querySelectorAll<HTMLButtonElement>(':scope>button')].filter(b=>!b.hidden));return;}this.expanded=!this.expanded;this.render();});this.more.setAttribute('aria-expanded','false');this.primary.append(this.more);controls.append(this.primary,this.quickRow,this.secondary);
    if(options.icons){for(const button of [...this.primary.querySelectorAll<HTMLButtonElement>(':scope>button')]){const path=options.icons[button.dataset.focusId??''];if(path)decorate(button,path,options.iconOnly?.includes(button.dataset.focusId??''));}if(options.openSettings)decorate(this.more,ICONS.settings);}
    this.render();
  }
  /** True while ⚙'s inline grid or the quick row is open: the control layer then stays shown. */
  get moreOpen():boolean{return this.expanded||this.quickOpen;}
  back():boolean{if(this.quickOpen){this.closeQuick();return true;}if(!this.expanded)return false;this.expanded=false;this.render();this.more.focus();return true;}
  private openQuick():void{
    const doc=this.panel.ownerDocument,proxies=(this.options.quick??[]).map(({id,label,picker,icon})=>{const source=doc.querySelector<HTMLButtonElement>(`[data-focus-id="${id}"]`);if(!source||source.hidden)return undefined;
      const b=productButton('player-quick-'+id.replace(/^vod-/,''),label??'',()=>{if(this.owner.signal.aborted||source.disabled)return;
        // A picker closes the row first, so its own Back returns to the main row and one more Back hides the controls.
        if(picker)this.closeQuick();source.click();this.render();});b.dataset.source=id;if(label)b.dataset.fixed='1';else b.textContent=source.getAttribute('aria-label')??source.textContent??'';if(icon)decorate(b,icon);return b;}).filter((b):b is HTMLButtonElement=>!!b);
    if(!proxies.length)return;
    this.quickRow.replaceChildren(...proxies);this.quickOpen=true;this.render();(proxies.find(b=>!b.disabled)??proxies[0]!).focus();
  }
  private closeQuick():void{
    if(!this.quickOpen)return;
    const from=[...this.quickRow.children].indexOf(this.panel.ownerDocument.activeElement as Element);
    this.quickOpen=false;this.quickRow.replaceChildren();this.render();
    const row=[...this.primary.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')].filter(b=>!b.hidden&&!b.disabled);(row[Math.max(0,Math.min(from,row.length-1))]??this.more).focus();
  }
  key(event:KeyboardEvent):boolean{
    // ADR-113: Down on the main row opens the quick settings row; Up from it closes it again. Hidden-layer keys are untouched.
    const active=this.panel.ownerDocument.activeElement,down=['ArrowDown','Down'].includes(event.key)||event.keyCode===40,up=['ArrowUp','Up'].includes(event.key)||event.keyCode===38;
    if(!this.owner.signal.aborted&&this.options.quick&&down&&!this.quickOpen&&!this.expanded&&active instanceof HTMLElement&&(this.primary.contains(active)||active===this.more)){this.openQuick();if(this.quickOpen)return true;}
    if(!this.owner.signal.aborted&&this.quickOpen&&up&&active instanceof HTMLElement&&this.quickRow.contains(active)){this.closeQuick();return true;}
    if(this.owner.signal.aborted||this.panel.ownerDocument.activeElement!==this.seek||!this.seekable)return false;
    if(['ArrowLeft','Left','ArrowRight','Right'].includes(event.key)||[37,39].includes(event.keyCode)){
      this.intent.preview((event.key==='ArrowLeft'||event.key==='Left'||event.keyCode===37?-1:1)*this.intent.stepMs());return true;
    }
    if(event.key==='Enter'||event.keyCode===13){if(!event.repeat){if(this.intent.target()===undefined)this.intent.preview(0);else this.intent.confirm();}return true;}
    return false;
  }
  update(timeMs:number,durationMs:number,seekable:boolean,badge:string):void{
    if(this.owner.signal.aborted)return;
    this.seekable=seekable&&durationMs>0;this.seek.setAttribute('aria-disabled',String(!this.seekable));this.badge.textContent=badge;
    const duration=Math.max(0,durationMs),actual=Math.max(0,Math.min(duration,timeMs)),target=this.intent.target();
    this.progress.max=duration||1;this.progress.value=actual;this.marker.hidden=target===undefined||!duration;if(target!==undefined)this.marker.style.left=Math.min(100,100*target/(duration||1))+'%';
    this.seek.setAttribute('aria-valuemin','0');this.seek.setAttribute('aria-valuemax',String(Math.floor(duration/1000)));this.seek.setAttribute('aria-valuenow',String(Math.floor((target??actual)/1000)));this.seek.setAttribute('aria-valuetext',`${target===undefined?'已播放':'预览'}${clockTime((target??actual)/1000)}，总时长${clockTime(duration/1000)}`);
    const delta=target===undefined?0:target-actual;
    this.timer.textContent=`${clockTime(actual/1000)} / ${clockTime(duration/1000)}${target===undefined?'':' · 预览 '+clockTime(target/1000)+(this.options.openSettings?`（${delta<0?'-':'+'}${clockTime(Math.abs(delta)/1000)}）`:' · 确认后跳转')}`;
    this.render();
  }
  private render():void{
    this.secondary.hidden=!this.expanded;this.more.setAttribute('aria-expanded',String(this.expanded));if(!this.options.openSettings)this.more.textContent=this.expanded?'收起更多':'更多';
    const buttons=(row:HTMLElement)=>[...row.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')].filter(b=>!b.hidden);
    // Lead choices (resume/from start) sit above the primary row and must stay in the remote path.
    const leading=this.lead?buttons(this.lead):[];
    // Quick-row proxies mirror their originals' label and state on every render.
    this.quickRow.hidden=!this.quickOpen;
    for(const b of [...this.quickRow.querySelectorAll<HTMLButtonElement>('button[data-source]')]){const source=this.panel.ownerDocument.querySelector<HTMLButtonElement>(`[data-focus-id="${b.dataset.source}"]`);if(!source)continue;b.disabled=source.disabled;if(!b.dataset.fixed)setLabel(b,source.getAttribute('aria-label')??source.textContent??'');const pressed=source.getAttribute('aria-pressed');if(pressed===null)b.removeAttribute('aria-pressed');else b.setAttribute('aria-pressed',pressed);}
    const rows=[...(leading.length?[leading]:[]),buttons(this.primary),...(this.quickOpen?[buttons(this.quickRow)]:[])],extra=this.expanded?buttons(this.secondary):[];
    for(let i=0;i<extra.length;i+=4)rows.push(extra.slice(i,i+4));
    const nearest=(row:HTMLButtonElement[]|undefined,index:number)=>row?.map((b,i)=>({b,d:Math.abs(i-index)})).filter(item=>!item.b.disabled).sort((a,b)=>a.d-b.d)[0]?.b.dataset.focusId;
    this.seek.dataset.left=this.seek.dataset.right='player-timeline';this.seek.dataset.up='player-timeline';this.seek.dataset.down=nearest(rows[0],0)??'player-more';
    rows.forEach((items,r)=>items.forEach((b,i)=>{if(b.disabled)return;b.dataset.left=items.slice(0,i).reverse().find(n=>!n.disabled)?.dataset.focusId??b.dataset.focusId;b.dataset.right=items.slice(i+1).find(n=>!n.disabled)?.dataset.focusId??b.dataset.focusId;b.dataset.up=nearest(rows[r-1],i)??'player-timeline';b.dataset.down=nearest(rows[r+1],i)??b.dataset.focusId;}));
  }
}
