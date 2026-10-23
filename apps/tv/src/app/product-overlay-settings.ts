import type {OverlayPreferenceAccess,OverlayPreferences} from '../../../../packages/contracts/src/overlay-dto.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {productButton} from './product-frame.ts';
import {searchKeyword} from './search-keyword.ts';
/** Default viewing preferences only; language tracks remain tied to actual media. */
export function productOverlaySettings(owner:ResourceOwner,shell:TvShell,store:OverlayPreferenceAccess):HTMLElement {
  const panel=document.createElement('section');panel.className='tv-default-overlays';panel.dataset.columns='2';
  const heading=document.createElement('h2');heading.textContent='字幕与弹幕';
  const status=document.createElement('p');status.setAttribute('role','status');
  const controls=document.createElement('div');controls.className='tv-default-overlays-grid';
  const button=(id:string,label:string,action:()=>void)=>productButton(id,label,()=>{if(!owner.signal.aborted)action();});
  let value:OverlayPreferences|undefined;
  const change=(action:()=>void)=>{if(!value)return;action();const saved=store.save(value);read();status.textContent=saved==='saved'?'已保存当前身份的观看偏好':'保存未确认，请重新读取';};
  const cycle=<T>(current:T,values:readonly T[])=>values[(values.indexOf(current)+1)%values.length]!;
  const dm=button('settings-overlay-dm','弹幕',()=>change(()=>{value!.danmaku.enabled=!value!.danmaku.enabled;}));
  const size=button('settings-overlay-size','弹幕字号',()=>change(()=>{value!.danmaku.fontSize=cycle(value!.danmaku.fontSize,[24,32,40,48]);}));
  const opacity=button('settings-overlay-opacity','弹幕透明度',()=>change(()=>{value!.danmaku.opacity=cycle(value!.danmaku.opacity,[.25,.5,.75,1]);}));
  const area=button('settings-overlay-area','弹幕区域',()=>change(()=>{value!.danmaku.area=cycle(value!.danmaku.area,[.25,.5,.75,1]);}));
  const sub=button('settings-overlay-sub','字幕',()=>change(()=>{value!.subtitles.enabled=!value!.subtitles.enabled;}));
  const subsize=button('settings-overlay-subsize','字幕字号',()=>change(()=>{value!.subtitles.fontSize=cycle(value!.subtitles.fontSize,[28,36,40,48,60,72]);}));
  const reset=button('settings-overlay-reset','重置当前身份的字幕弹幕偏好',()=>shell.openModal('reset-default-overlays',child=>{
    const node=document.createElement('section'),h=document.createElement('h2'),note=document.createElement('p');h.textContent='重置字幕与弹幕偏好？';note.textContent='仅清除当前身份的字幕/弹幕字号、开关、偏移及过滤词；保留账号、续播、队列和写操作记录。';
    const keep=button('settings-overlay-keep','保留当前偏好',()=>{void shell.back();});
    const yes=button('settings-overlay-confirm','确认重置',()=>{if(child.signal.aborted)return;yes.disabled=true;const result=store.clear();void shell.closeOwnedModal(child).then(()=>{if(!owner.signal.aborted){read();status.textContent=result==='deleted'?'已恢复默认字幕与弹幕偏好':'重置未确认，请重新读取';}});});node.append(h,note,keep,yes);return node;
  },'settings-overlay-keep'));
  const filters=button('settings-overlay-filter','添加弹幕过滤词',()=>{if(!value||value.danmaku.filters.length>=64)return;shell.openModal('default-filter-keyword',child=>searchKeyword(child,shell,word=>{if(owner.signal.aborted||!value)return;if(!value.danmaku.filters.includes(word))change(()=>value!.danmaku.filters.push(word));},'过滤词'),'keyword-key-a');});
  const filterList=document.createElement('div');filterList.className='tv-default-filters';let page=0;
  const previous=button('settings-filter-prev','上一组过滤词',()=>{page--;read();}),next=button('settings-filter-next','下一组过滤词',()=>{page++;read();});
  function read():void{
    const result=store.read();value=result.kind==='ok'?result.value:undefined;
    for(const b of [dm,size,opacity,area,sub,subsize,filters])b.disabled=!value;
    filterList.replaceChildren();previous.disabled=next.disabled=true;
    if(!value){status.textContent=`字幕弹幕偏好不可读（${result.kind}），仅可确认重置或返回`;return;}
    dm.textContent='弹幕：'+(value.danmaku.enabled?'开启':'关闭');dm.setAttribute('aria-pressed',String(value.danmaku.enabled));size.textContent='弹幕字号：'+value.danmaku.fontSize;opacity.textContent='弹幕透明度：'+Math.round(value.danmaku.opacity*100)+'%';area.textContent='弹幕区域：'+value.danmaku.area*100+'%';sub.textContent='字幕：'+(value.subtitles.enabled?'开启':'关闭');sub.setAttribute('aria-pressed',String(value.subtitles.enabled));subsize.textContent='字幕字号：'+value.subtitles.fontSize;
    filters.disabled=value.danmaku.filters.length>=64;page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(value.danmaku.filters.length/4)-1)));previous.disabled=page===0;next.disabled=(page+1)*4>=value.danmaku.filters.length;
    value.danmaku.filters.slice(page*4,page*4+4).forEach((word,i)=>filterList.append(button('settings-filter-'+i,'删除过滤词：'+word,()=>change(()=>{value!.danmaku.filters=value!.danmaku.filters.filter(v=>v!==word);})))) ;
    status.textContent=`${value.danmaku.filters.length}/64个过滤词；语言轨道与字幕偏移在播放时调整，仅改变观看效果`;
  }
  controls.append(dm,size,opacity,area,sub,subsize,filters,reset,previous,next);panel.append(heading,controls,status,filterList);read();return panel;
}
