import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { HotSearchTerm } from '../../../../packages/contracts/src/hot-search.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { KernelHotSearch } from '../platform/public-lanes.ts';
import { homeSnapshots } from '../platform/home-snapshot-store.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
/** Public terms are transient; choosing one explicitly enters the normal search. */
export function hotSearch(owner:ResourceOwner,shell:TvShell,accepted:(keyword:string)=>void):HTMLElement {
  const section=document.createElement('section');section.className='hot-search-panel';
  const heading=document.createElement('h2');heading.id='hot-search-title';heading.textContent='热搜';section.setAttribute('aria-labelledby',heading.id);
  const status=document.createElement('p');status.setAttribute('role','status');
  const list=document.createElement('div');list.className='hot-search-terms';
  const worker=new KernelHotSearch(),sessions=new SessionManager();
  owner.add('hot-search-worker',async()=>{sessions.dispose();await worker.dispose();});
  let terms:HotSearchTerm[]=[],page=0,busy=false,selected=false;
  const button=(id:string,label:string,action:()=>void)=>{const node=document.createElement('button');node.dataset.focusId=id;node.textContent=label;node.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return node;};
  const back=button('hot-back','返回',()=>{void shell.back();});
  const refresh=button('hot-refresh','刷新热搜',()=>{void read();});
  const previous=button('hot-previous','上一组',()=>{if(!busy&&page>0){page--;render();}});
  const next=button('hot-next','下一组',()=>{if(!busy&&(page+1)*6<terms.length){page++;render();}});
  function render():void{
    if(owner.signal.aborted)return;
    list.replaceChildren();previous.disabled=busy||page===0;next.disabled=busy||(page+1)*6>=terms.length;
    status.textContent=terms.length?`公开热搜 · ${terms.length} 词 · 第 ${page+1} 组`:'暂无可搜索热词';
    const slice=terms.slice(page*6,(page+1)*6);
    slice.forEach((term,i)=>{
      const node=button('hot-term-'+i,`第 ${term.rank} 名 · ${term.label}`,()=>{
        if(busy||selected)return;selected=true;
        void shell.back().then(()=>{if(!shell.restartRequired)accepted(term.keyword);});
      });
      node.dataset.left='hot-term-'+(i%2?i-1:i);node.dataset.right='hot-term-'+(i%2===0&&i+1<slice.length?i+1:i);
      node.dataset.up=i<2?'hot-refresh':'hot-term-'+(i-2);
      node.dataset.down=i+2<slice.length?'hot-term-'+(i+2):next.disabled?'hot-back':'hot-next';list.append(node);
    });
    if(section.isConnected&&!list.contains(document.activeElement))(list.querySelector<HTMLButtonElement>('button')??refresh).focus();
  }
  async function read():Promise<void>{
    if(busy||owner.signal.aborted)return;
    // ADR-116: the last terms (no older than a day) stay on screen while the list refreshes.
    const shown=terms.length>0;
    busy=true;if(!shown){terms=[];page=0;list.replaceChildren();back.focus();}refresh.disabled=previous.disabled=next.disabled=true;status.textContent=shown?'正在更新热搜，可先选上次的词':'正在读取热搜';
    sessions.invalidate();const task=sessions.begin('search-hot');
    const abort=()=>{sessions.invalidate();};owner.signal.addEventListener('abort',abort,{once:true});
    try{
      const result=await worker.run({version:1,scope:task.scope,operation:'public-search-hot'},task.signal);
      if(owner.signal.aborted||!sessions.accepts(task.scope))return;
      if(result.kind!=='ok'){
        status.textContent=shown?'显示的是上次的热搜，可手动刷新':result.kind==='api_error'?`热搜接口暂不可用（API ${result.apiCode}），可手动刷新`:`热搜读取失败（${result.code}），可手动刷新`;
        return;
      }
      terms=result.items;page=0;if(terms.length)homeSnapshots().writeHot(terms);
    }catch(error){if(!owner.signal.aborted)status.textContent=error instanceof DomainError&&error.code==='unknown'?'资源关闭未确认，请重新打开应用':shown?'显示的是上次的热搜，可手动刷新':'热搜读取未确认，可返回或手动刷新';}
    finally{
      owner.signal.removeEventListener('abort',abort);task.finish();busy=false;
      if(!owner.signal.aborted){refresh.disabled=false;const note=status.textContent;if(terms.length||note==='正在读取热搜'){render();if(shown&&note!=='正在更新热搜，可先选上次的词')status.textContent=note;}else refresh.focus();}
    }
  }
  section.append(heading,back,refresh,previous,next,status,list);
  const last=homeSnapshots().readHot();if(last){terms=last;render();}
  void read();return section;
}
