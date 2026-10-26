import { parseSearchKeyword } from '../../../../packages/contracts/src/search.ts';
import { sharedInitials } from '../platform/initials-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
/** Local keyword entry for search or viewing filters. One shell focus owner. */
export function searchKeyword(owner:ResourceOwner,shell:TvShell,accepted:(value:string)=>void,target:'视频'|'UP主'|'番剧'|'直播'|'过滤词'|'内容'='视频'):HTMLElement {
  const modal=document.createElement('section');modal.className='search-panel';
  const title=document.createElement('h2');title.id='keyword-title';title.textContent=target==='过滤词'?'弹幕过滤词 · 首字母选词':`搜索${target} · 首字母选词`;modal.setAttribute('aria-labelledby',title.id);
  const preview=document.createElement('p');preview.setAttribute('aria-label','已选关键词');preview.dataset.keywordPreview='';
  const buffer=document.createElement('p');buffer.setAttribute('aria-label','首字母');buffer.dataset.keywordBuffer='';
  const state=document.createElement('p');state.setAttribute('role','status');
  const candidates=document.createElement('div');candidates.className='keyword-candidates';candidates.setAttribute('aria-label','中文词语候选');
  const tools=document.createElement('div');tools.className='keyword-tools';
  const keys=document.createElement('div');keys.className='keyword-keys';keys.setAttribute('aria-label','字母与数字');
  const footer=document.createElement('div');footer.className='keyword-footer';
  const worker=sharedInitials();owner.add('initials-worker',()=>worker.cancel());
  let letters='',keyword='',words:string[]=[],page=0,busy=false,generation=0,submitting=false;
  const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted&&!submitting)action();});return b;};
  const focus=(id:string)=>modal.querySelector<HTMLButtonElement>(`[data-focus-id="${id}"]`)?.focus();
  const choose=(word:string)=>{if(Array.from(keyword+word).length>32){state.textContent='关键词最多32字';return false;}keyword+=word;return true;};
  const candidateButtons=Array.from({length:8},(_,i)=>button('keyword-candidate-'+i,'—',()=>{const word=words[page*8+i];if(!busy&&letters&&word&&choose(word)){letters='';refresh();focus('keyword-key-a');}}));
  candidates.append(...candidateButtons);
  function pageChange(delta:number):void{const target=page+delta;if(busy||target<0||target*8>=words.length)return;page=target;render();state.textContent=`本地候选 · 第 ${page+1} / ${Math.ceil(words.length/8)} 页`;focus('keyword-candidate-0');}
  const previous=button('keyword-prev','上一组候选',()=>pageChange(-1)),next=button('keyword-next','下一组候选',()=>pageChange(1));
  const literal=button('keyword-literal','使用字母/数字',()=>{if(letters&&choose(letters)){letters='';refresh();}});
  const remove=()=>{if(letters)letters=letters.slice(0,-1);else keyword=Array.from(keyword).slice(0,-1).join('');refresh();};
  const erase=button('keyword-delete','退格',remove),clear=button('keyword-clear','清空',()=>{keyword=letters='';refresh();});tools.append(previous,next,literal,erase,clear);
  function append(letter:string):void{if(letters.length<24){letters+=letter;refresh();}}
  const keyButtons=[...'abcdefghijklmnopqrstuvwxyz0123456789'].map(letter=>button('keyword-key-'+letter,letter.toUpperCase(),()=>append(letter)));keys.append(...keyButtons);
  const done=button('keyword-done',target==='过滤词'?'确认过滤词':'确认关键词并搜索',()=>{
    if(letters){state.textContent='先选择中文候选，或使用字母/数字';return;}
    let value:string;try{value=parseSearchKeyword(keyword);}catch{state.textContent='先选择关键词';return;}
    submitting=true;const generationAtSubmit=generation;
    // Close input completely before the parent starts network work. Home/account
    // invalidation before this continuation must not dispatch a stale search.
    void shell.back().then(()=>{if(generationAtSubmit===generation && !shell.restartRequired)accepted(value);});
  });
  const retry=button('keyword-retry','重试候选',refresh),cancel=button('keyword-cancel','取消',()=>{letters='';void shell.back();});footer.append(done,retry,cancel);
  function wire(buttons:HTMLButtonElement[],columns:number,up:string,down:string):void{
    const nearest=(row:HTMLButtonElement[],col:number)=>row.filter(b=>!b.disabled).sort((a,b)=>Math.abs(buttons.indexOf(a)%columns-col)-Math.abs(buttons.indexOf(b)%columns-col))[0];
    buttons.forEach((b,i)=>{if(b.disabled)return;const start=Math.floor(i/columns)*columns,col=i%columns,row=buttons.slice(start,start+columns).filter(v=>!v.disabled),at=row.indexOf(b),id=b.dataset.focusId!;
      b.dataset.left=row[at-1]?.dataset.focusId??id;b.dataset.right=row[at+1]?.dataset.focusId??id;
      b.dataset.up=(start>0?nearest(buttons.slice(start-columns,start),col)?.dataset.focusId:undefined)??up;
      b.dataset.down=nearest(buttons.slice(start+columns,start+2*columns),col)?.dataset.focusId??down;
    });
  }
  function render():void{
    preview.textContent=keyword||'尚未选择关键词';buffer.textContent=letters.toUpperCase()||'输入词语首字母，例如 NH → 你好';
    candidateButtons.forEach((b,i)=>{b.textContent=words[page*8+i]??'—';b.disabled=busy||!words[page*8+i];});
    previous.disabled=busy||page===0;next.disabled=busy||(page+1)*8>=words.length;
    wire(candidateButtons,4,'keyword-key-a','keyword-literal');wire([previous,next,literal,erase,clear],5,candidateButtons.find(b=>!b.disabled)?.dataset.focusId??'keyword-key-a','keyword-key-a');
    wire(keyButtons,10,'keyword-literal','keyword-done');wire([done,retry,cancel],3,'keyword-key-4','keyword-done');
    const active=document.activeElement as HTMLButtonElement|null;if(active&&modal.contains(active)&&active.disabled)focus('keyword-key-a');
  }
  function refresh():void{
    const epoch=++generation;page=0;words=[];busy=!!letters;render();
    if(!letters){worker.cancel();state.textContent=target==='过滤词'?'本地候选；确认后只添加观看过滤词':`本地候选；确认关键词后搜索${target}`;return;}
    state.textContent='正在查找本地候选';
    void worker.query(letters).then(value=>{if(owner.signal.aborted||epoch!==generation)return;words=value;busy=false;render();state.textContent=words.length?`本地候选 · 第 1 / ${Math.ceil(words.length/8)} 页`:'无候选，可使用字母/数字或重新输入';}).catch(()=>{if(owner.signal.aborted||epoch!==generation)return;busy=false;render();state.textContent='本地候选加载失败，可重试或返回';});
  }
  shell.modalInput(owner,{back(){if(!letters)return false;letters='';refresh();return true;},key(event){if(submitting)return false;if(/^[a-z0-9]$/i.test(event.key)){if(!event.repeat)append(event.key.toLowerCase());return true;}if(event.key==='Backspace'){if(!event.repeat)remove();return true;}return false;}});
  modal.append(title,preview,buffer,candidates,tools,keys,state,footer);refresh();
  // Input frame's close is expected for submit; parent also checks its own owner.
  owner.add('keyword-buffer',()=>{worker.cancel();words=[];letters=keyword='';});
  return modal;
}
