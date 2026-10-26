import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import {localBookmarks} from './local-bookmarks.ts';
import type { LocalRead, LocalWrite, ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import type { SearchHistoryRead, SearchHistoryStore } from '../../../../packages/contracts/src/search-history.ts';
export function localReadIssue(value: Exclude<LocalRead,{kind:'ok'}>['kind']): string {
  return value === 'corrupt' ? '本地记录损坏，请确认清除后再保存' : value === 'future' ? '本地记录版本不支持，请确认清除后再保存' : value === 'unconfirmed' ? '本地保存结果未确认，请重新读取' : '本地存储不可用';
}
export function localSettings(owner: ResourceOwner, shell: TvShell, profile: ProfileStore, diagnostics: AppDiagnostics, writeSummary: () => {total:number;unknown:number} | 'guest' | undefined = () => 'guest', history?: SearchHistoryStore,clearReadCache?:()=>void,queue?:QueueStore,returnHome?:()=>void,forgetSnapshot?:()=>void): HTMLElement {
  const section = document.createElement('section'), heading = document.createElement('h1'); heading.textContent = '设置与本地记录';
  const status = document.createElement('p'); status.setAttribute('role','status');
  const list = document.createElement('p');
  const writes = document.createElement('p'); writes.dataset.writeSummary = '';
  const button = (id: string, label: string, action: () => void) => { const b = document.createElement('button'); b.dataset.focusId=id; b.textContent=label; b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b; };
  let current: LocalRead;
  const resume = button('local-resume','',()=>{ if(current.kind==='ok') save(profile.preferences({...current.value.preferences,resumePrompt:!current.value.preferences.resumePrompt})); });
  const step = button('local-step','',()=>{ if(current.kind==='ok') save(profile.preferences({...current.value.preferences,jumpSeconds:current.value.preferences.jumpSeconds===5?10:current.value.preferences.jumpSeconds===10?30:5})); });
  const refresh = button('local-refresh','重新读取',()=>{read();readHistory();});
  let historyCurrent:SearchHistoryRead|undefined;
  const historyStatus=document.createElement('p');historyStatus.setAttribute('aria-live','polite');historyStatus.dataset.historyStatus='';
  const historyToggle=button('history-recording','搜索历史记录',()=>{
    if(!history||historyCurrent?.kind!=='ok')return;const result=history.recording(!historyCurrent.value.enabled);readHistory();
    if(result!=='saved'){historyStatus.textContent='搜索记录开关保存未确认，请重新读取';historyToggle.disabled=true;refresh.focus();}
  });
  const historyClear=button('history-clear','清空当前身份的搜索历史',()=>{
    if(!history)return;const reset=historyCurrent?.kind!=='ok';
    shell.openModal('clear-search-history',modalOwner=>{
      const modal=document.createElement('section'),heading=document.createElement('h2');heading.id='history-clear-title';heading.textContent=reset?'重置当前身份的搜索历史并开启记录？':'清空当前身份的搜索历史？';modal.setAttribute('aria-labelledby',heading.id);
      const note=document.createElement('p');note.textContent=reset?'只重置当前身份的搜索记录': '保留当前记录开关';
      modal.append(heading,note,button('history-keep','保留历史',()=>{void shell.back();}),button('history-confirm-clear',reset?'确认重置':'确认清空',()=>{
        if(modalOwner.signal.aborted)return;const result=reset?history.clear():history.forgetAll();
        void shell.back().then(()=>{if(owner.signal.aborted)return;readHistory();historyStatus.textContent=result==='deleted'||result==='saved'?'当前身份的搜索历史已清空':'搜索历史清空未确认，请重新读取';});
      }));return modal;
    });
  });
  function readHistory():void{
    if(owner.signal.aborted||!history)return;historyCurrent=history.read();historyToggle.disabled=historyCurrent.kind!=='ok';
    historyClear.textContent=historyCurrent.kind==='ok'?'清空当前身份的搜索历史':'重置当前身份的搜索历史';
    historyToggle.textContent=historyCurrent.kind==='ok'?`搜索历史记录：${historyCurrent.value.enabled?'开':'关'}`:'搜索历史记录';
    if(historyCurrent.kind==='ok'){historyToggle.setAttribute('aria-pressed',String(historyCurrent.value.enabled));historyStatus.textContent=`${historyCurrent.value.terms.length} 个搜索词，仅保存在电视${historyCurrent.value.enabled?'':'；记录已关闭，已有历史仍保留'}`;}
    else{historyToggle.removeAttribute('aria-pressed');historyStatus.textContent=localReadIssue(historyCurrent.kind);}
  }
  function read(): void {
    if (owner.signal.aborted) return; current=profile.read(); resume.disabled=step.disabled=current.kind!=='ok';
    const summary=writeSummary(); writes.textContent=summary==='guest'?'账号写操作需先登录':summary?`当前账号写操作记录 ${summary.total} 条，未确认 ${summary.unknown} 条`:'写操作记录不可读，提交已锁定';
    if(current.kind==='ok'){
      resume.textContent='自动续播：'+(current.value.preferences.resumePrompt?'开':'关'); resume.setAttribute('aria-pressed',String(current.value.preferences.resumePrompt));
      step.textContent=`遥控跳转步长：${current.value.preferences.jumpSeconds} 秒`; const all=profile.bookmarks?.();list.textContent=all?.kind==='ok'?`当前身份保存了 ${all.items.length} 条本机续播记录（首P ${all.items.filter(p=>p.part===1).length} / 其他分P ${all.items.filter(p=>p.part>1).length}）`:all?'分P记录未能完整读取，请进入本机观看记录核查':`当前身份保存了 ${current.value.resume.length} 条首P续播记录`; status.textContent='仅保存在电视，不写入云端';
    }else{resume.textContent='自动续播';resume.removeAttribute('aria-pressed');step.textContent='遥控跳转步长';list.textContent='';status.textContent=localReadIssue(current.kind);diagnostics.add('local',current.kind==='unavailable'?'read_unavailable':current.kind==='future'?'read_future':'read_corrupt');}
  }
  function save(result: LocalWrite): void {
    read();diagnostics.add('local',result==='saved'?'save_confirmed':'save_unconfirmed');status.textContent=result==='saved'?'已保存到电视':'本地保存未确认，请重新读取后核查';
    if(result!=='saved'){resume.disabled=step.disabled=true;refresh.focus();}
  }
  const clear=button('local-clear','清除当前身份的本地设置与续播',()=>{
    shell.openModal('clear-local',modalOwner=>{
      const modal=document.createElement('section'),title=document.createElement('h2');title.id='clear-local-title';title.textContent='清除当前身份的本地设置与续播？';modal.setAttribute('aria-labelledby',title.id);modal.append(title);
      modal.append(button('local-keep','保留',()=>{void shell.back();}),button('local-confirm-clear','确认清除',()=>{
        if(modalOwner.signal.aborted)return;
        // ADR-116: clearing this identity's local data also forgets its 为你推荐 snapshot.
        const result=profile.clear();forgetSnapshot?.();diagnostics.add('local',result==='deleted'?'deleted':'delete_unconfirmed');
        void shell.back().then(()=>{if(!owner.signal.aborted){read();status.textContent=result==='deleted'?'当前身份的本地记录已清除':'本地清除未确认，请重新读取后核查';}});
      }));return modal;
    });
  });
  const report=button('diagnostics','查看脱敏诊断',()=>{
    shell.openModal('diagnostics',()=>{
      const modal=document.createElement('section'),title=document.createElement('h2');modal.className='diagnostics-panel';title.id='diagnostics-title';title.textContent='本次运行的脱敏诊断';modal.setAttribute('aria-labelledby',title.id);
      const output=document.createElement('pre');output.dataset.focusId='diagnostics-output';output.tabIndex=0;output.setAttribute('aria-label','诊断记录');
      let report=JSON.parse(diagnostics.snapshot()) as {schema:number;build:string;entries:unknown[]},page=0;
      const label=document.createElement('p');
      const previous=button('diagnostics-previous','上一页',()=>{page--;render();});
      const next=button('diagnostics-next','下一页',()=>{page++;render();});
      const back=button('diagnostics-back','返回设置',()=>{void shell.back();});
      function render():void{const pages=Math.max(1,Math.ceil(report.entries.length/8));page=Math.max(0,Math.min(page,pages-1));previous.disabled=page===0;next.disabled=page===pages-1;label.textContent=`第 ${page+1} / ${pages} 页`;output.textContent=JSON.stringify({...report,entries:report.entries.slice(page*8,page*8+8)});if(document.activeElement===previous&&previous.disabled||document.activeElement===next&&next.disabled)back.focus();}
      modal.append(title,back,previous,next,button('diagnostics-clear','清除本次诊断',()=>{diagnostics.clear();report=JSON.parse(diagnostics.snapshot());page=0;render();}),label,output);render();return modal;
    });
  });
  const bookmarks=button('local-bookmarks','本机观看记录 · 含分P',()=>{shell.openModal('local-bookmarks',child=>localBookmarks(child,shell,profile,queue),'bookmarks-back');});bookmarks.disabled=!profile.bookmarks;
  const cache=button('local-cache','清理当前账号的列表缓存',()=>clearReadCache?.());cache.disabled=!clearReadCache;
  section.append(heading,button('settings-back','返回首页',()=>{if(returnHome)returnHome();else void shell.back();}),resume,step,refresh,bookmarks,cache,clear,report,status,list,writes);
  if(history){const heading=document.createElement('h2');heading.textContent='搜索记录';section.append(heading,historyToggle,historyClear,historyStatus);}
  read();readHistory();return section;
}
