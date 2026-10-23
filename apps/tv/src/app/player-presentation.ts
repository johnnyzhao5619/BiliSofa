import type {ResourceOwner} from './resource-owner.ts';
import {clockTime} from '../ui/content-card.ts';
import {productButton} from './product-frame.ts';
declare const BILISOFA_PRODUCT_PLAYER:boolean;
export const PRODUCT_PLAYER=typeof BILISOFA_PRODUCT_PLAYER!=='undefined'&&BILISOFA_PRODUCT_PLAYER;
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
  private seekable=false;
  constructor(private readonly owner:ResourceOwner,private readonly panel:HTMLElement,title:HTMLElement,private readonly timer:HTMLElement,status:HTMLElement,controls:HTMLElement,primaryIds:readonly string[],private readonly intent:Intent){
    panel.classList.add('tv-player');title.classList.add('tv-player-title');status.classList.add('tv-player-status');
    this.badge.className='tv-player-badge';const heading=document.createElement('div');heading.className='tv-player-heading';title.replaceWith(heading);heading.append(title,this.badge);
    this.seek.className='tv-player-seek';this.seek.dataset.focusId='player-timeline';this.seek.tabIndex=0;this.seek.setAttribute('role','slider');this.seek.setAttribute('aria-label','播放进度，左右预览，确认跳转，返回取消');
    this.progress.max=1;this.progress.value=0;this.progress.setAttribute('aria-hidden','true');this.marker.className='tv-player-marker';this.marker.hidden=true;this.seek.append(this.progress,this.marker);timer.before(this.seek);timer.classList.add('tv-player-time');
    this.primary.className='tv-player-primary';this.secondary.className='tv-player-secondary';this.secondary.hidden=true;
    const buttons=[...controls.querySelectorAll<HTMLButtonElement>(':scope>button')];
    for(const button of buttons)(primaryIds.includes(button.dataset.focusId??'')?this.primary:this.secondary).append(button);
    this.more=productButton('player-more','更多',()=>{if(owner.signal.aborted)return;this.expanded=!this.expanded;this.render();});this.more.setAttribute('aria-expanded','false');this.primary.append(this.more);controls.append(this.primary,this.secondary);
    this.render();
  }
  get moreOpen():boolean{return this.expanded;}
  back():boolean{if(!this.expanded)return false;this.expanded=false;this.render();this.more.focus();return true;}
  key(event:KeyboardEvent):boolean{
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
    this.timer.textContent=`${clockTime(actual/1000)} / ${clockTime(duration/1000)}${target===undefined?'':' · 预览 '+clockTime(target/1000)+' · 确认后跳转'}`;
    this.render();
  }
  private render():void{
    this.secondary.hidden=!this.expanded;this.more.setAttribute('aria-expanded',String(this.expanded));this.more.textContent=this.expanded?'收起更多':'更多';
    const buttons=(row:HTMLElement)=>[...row.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')].filter(b=>!b.hidden);
    const rows=[buttons(this.primary)],extra=this.expanded?buttons(this.secondary):[];
    for(let i=0;i<extra.length;i+=4)rows.push(extra.slice(i,i+4));
    const nearest=(row:HTMLButtonElement[]|undefined,index:number)=>row?.map((b,i)=>({b,d:Math.abs(i-index)})).filter(item=>!item.b.disabled).sort((a,b)=>a.d-b.d)[0]?.b.dataset.focusId;
    this.seek.dataset.left=this.seek.dataset.right='player-timeline';this.seek.dataset.up='player-timeline';this.seek.dataset.down=nearest(rows[0],0)??'player-more';
    rows.forEach((items,r)=>items.forEach((b,i)=>{if(b.disabled)return;b.dataset.left=items.slice(0,i).reverse().find(n=>!n.disabled)?.dataset.focusId??b.dataset.focusId;b.dataset.right=items.slice(i+1).find(n=>!n.disabled)?.dataset.focusId??b.dataset.focusId;b.dataset.up=nearest(rows[r-1],i)??'player-timeline';b.dataset.down=nearest(rows[r+1],i)??b.dataset.focusId;}));
  }
}
