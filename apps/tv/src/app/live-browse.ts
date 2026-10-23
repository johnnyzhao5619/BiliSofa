import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {LiveReadFailure,type LiveBrowseQuery,type LiveBatch,type LiveCard,type LiveArea} from '../../../../packages/contracts/src/live-product.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {liveReader,type OpenLive} from './live-reader.ts';
export function liveBrowse(owner:ResourceOwner,shell:TvShell,open:OpenLive,following:boolean,play:(card:LiveCard)=>void):HTMLElement {
  const panel=document.createElement('section');panel.className='live-browse-panel';const heading=document.createElement('h2'),status=document.createElement('p'),grid=document.createElement('div');grid.className='live-room-grid';status.setAttribute('role','status');status.tabIndex=-1;
  const reader=liveReader(owner,open);let query:LiveBrowseQuery={kind:following?'following':'recommend',...(following?{page:1}:{})} as LiveBrowseQuery,batch:LiveBatch|undefined,localPage=0,busy=false,areas:LiveArea[]|undefined;
  const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
  const back=button('live-browse-back','返回',()=>{void shell.back();}),refresh=button('live-browse-refresh','刷新直播列表',()=>{void read(query.kind==='recommend'?query:{...query,page:1});});
  const pick=button('live-browse-areas','直播分区',()=>{void chooseArea();});pick.hidden=following;
  const recommend=button('live-browse-recommend','返回直播推荐',()=>{void read({kind:'recommend'});});recommend.hidden=following;
  const previous=button('live-browse-previous','上一页',()=>{if(localPage){localPage--;render();}else if(query.kind!=='recommend'&&query.page>1)void read({...query,page:query.page-1},true);});
  const next=button('live-browse-next','下一页',()=>{if(batch&&(localPage+1)*4<batch.items.length){localPage++;render();}else if(query.kind!=='recommend'&&batch&&!batch.noMore)void read({...query,page:query.page+1});});previous.disabled=next.disabled=true;
  function render(){
    if(owner.signal.aborted)return;grid.replaceChildren();refresh.disabled=pick.disabled=recommend.disabled=busy;previous.disabled=next.disabled=true;if(!batch||busy)return;
    heading.textContent=query.kind==='following'?'我的关注直播间':query.kind==='area'?'分区直播':'直播推荐 · 公共首页快照';
    const pages=Math.max(1,Math.ceil(batch.items.length/4));localPage=Math.max(0,Math.min(localPage,pages-1));status.textContent=batch.items.length?`${query.kind==='recommend'?'首页快照':`源端第${query.page}组`} · 本组第${localPage+1}/${pages}页`:'当前列表为空';
    const rows=batch.items.slice(localPage*4,localPage*4+4);rows.forEach((card,i)=>{const node=button('live-room-'+i,`${card.title} · ${card.owner} · ${card.state==='live'?'直播中':card.state==='offline'?'未开播':'状态未提供'}`,()=>summary(card)),id=(n:number)=>'live-room-'+n;node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<rows.length?i+1:i);node.dataset.up=i<2?'live-browse-refresh':id(i-2);node.dataset.down=i+2<rows.length?id(i+2):'live-browse-back';grid.append(node);});
    previous.disabled=localPage===0&&(query.kind==='recommend'||query.page===1);next.disabled=(localPage+1)*4>=batch.items.length&&(query.kind==='recommend'||batch.noMore||query.page===25000);
    if(panel.isConnected)(grid.querySelector<HTMLButtonElement>('button')??refresh).focus();
  }
  function summary(card:LiveCard){shell.openModal('live-room-summary',()=>{const node=document.createElement('section');node.className='live-room-summary';const title=document.createElement('h2'),body=document.createElement('p');title.textContent=card.title;body.textContent=`${card.owner} · ${card.category||'分区未提供'} · ${card.state==='live'?'列表快照显示直播中':'开播状态需播放前重新核对'}`;const start=button('live-room-play','播放直播',()=>{if(card.roomId)play(card);});start.disabled=!card.roomId;node.append(title,body,button('live-room-summary-back','返回直播列表',()=>{void shell.back();}),start);return node;},'live-room-summary-back');}
  async function read(target:LiveBrowseQuery,last=false){
    if(busy||owner.signal.aborted)return;busy=true;batch=undefined;query=target;heading.textContent=query.kind==='following'?'我的关注直播间':query.kind==='area'?'分区直播':'直播推荐 · 公共首页快照';status.textContent='正在读取直播列表';render();status.focus();
    try{const result=await reader.run(actor=>actor.browse(target,owner.signal));if(owner.signal.aborted)return;query=target;batch=result;localPage=last?Math.max(0,Math.ceil(result.items.length/4)-1):0;}
    catch(error){if(!owner.signal.aborted)status.textContent=error instanceof LiveReadFailure&&error.apiCode!==undefined?`直播接口暂不可用（API ${error.apiCode}），未自动重试`:error instanceof DomainError&&error.code==='login'?'账号失效，请返回管理账号':`直播列表读取失败（live.${error instanceof DomainError?error.code:'unknown'}），可返回或手动刷新`;}
    finally{busy=false;if(!owner.signal.aborted){render();if(!batch)refresh.focus();}}
  }
  async function chooseArea(){
    if(busy||owner.signal.aborted)return;
    if(!areas){busy=true;refresh.disabled=pick.disabled=true;try{areas=await reader.run(actor=>actor.areas(owner.signal));}catch(error){if(!owner.signal.aborted)status.textContent=`直播分区读取失败（live.${error instanceof DomainError?error.code:'unknown'}）`;return;}finally{busy=false;if(!owner.signal.aborted)refresh.disabled=pick.disabled=false;}}
    if(owner.signal.aborted)return;
    shell.openModal('live-areas',child=>{
      const node=document.createElement('section');node.className='live-area-picker';const title=document.createElement('h2'),list=document.createElement('div'),paging=document.createElement('p');list.className='live-area-grid';let parent:LiveArea|undefined,page=0,parentPage=0;
      const goBack=button('live-area-back','返回直播列表',()=>{parent=undefined;void shell.back();});const parents=button('live-area-parents','上级分区',()=>up());const before=button('live-area-prev','上一组',()=>{page--;show();}),after=button('live-area-next','下一组',()=>{page++;show();});
      function up(){const id=parent?.id;parent=undefined;page=parentPage;show(id);}
      function show(restoreId?:string){if(child.signal.aborted)return;const entries=parent?[{id:'0',title:'全部此分区'},...parent.children]:areas!;page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(entries.length/8)-1)));title.textContent=parent?.title??'选择直播分区';paging.textContent=`第${page+1}/${Math.max(1,Math.ceil(entries.length/8))}组`;list.replaceChildren();parents.disabled=!parent;
        entries.slice(page*8,page*8+8).forEach((item,i)=>{const entry=button('live-area-'+i,item.title,()=>{if(!parent){parentPage=page;parent=areas!.find(a=>a.id===item.id);page=0;show();}else{const target:LiveBrowseQuery={kind:'area',parentId:parent.id,areaId:item.id,page:1};parent=undefined;void shell.back().then(()=>{if(!owner.signal.aborted)return read(target);});}});entry.dataset.areaId=item.id;const count=Math.min(8,entries.length-page*8),at=(index:number)=>'live-area-'+index;entry.dataset.left=at(i%4?i-1:i);entry.dataset.right=at(i%4<3&&i+1<count?i+1:i);entry.dataset.up=i<4?at(i):at(i-4);entry.dataset.down=i+4<count?at(i+4):'live-area-back';list.append(entry);});before.disabled=page===0;after.disabled=(page+1)*8>=entries.length;((restoreId?list.querySelector<HTMLButtonElement>('[data-area-id="'+restoreId+'"]'):undefined)??list.querySelector<HTMLButtonElement>('button')??goBack).focus();}
      shell.modalInput(child,{back(){if(!parent)return false;up();return true;},key(){return false;}});node.append(title,paging,list,goBack,parents,before,after);show();return node;
    },'live-area-0');
  }
  panel.append(heading,back,refresh,pick,recommend,status,grid,previous,next);void read(query);return panel;
}
