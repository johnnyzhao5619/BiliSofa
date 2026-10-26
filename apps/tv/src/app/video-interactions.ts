import {InteractionReadError} from '../../../../packages/contracts/src/video-interactions.ts';
import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {VideoInteractionAccess,VideoOperation,InteractionSnapshot,InteractionOutcome} from '../../../../packages/contracts/src/video-interactions-dto.ts';
import type {TvShell} from './tv-shell.ts';
import type {ResourceOwner} from './resource-owner.ts';
const labels={like:'点赞',follow:'关注UP','watch-later':'稍后再看',favorite:'指定收藏夹',coin:'投币',triple:'三连'};
/** Read -> concrete preview -> one disabled-on-dispatch confirm -> independent
 * readback. Back/Home/source change cannot issue or resume a write. */
export function videoInteractions(shell:TvShell,open:()=>VideoInteractionAccess,valid:()=>boolean,initialAction?:'like'|'follow'|'watch-later',onSnapshot?:(value:InteractionSnapshot|undefined)=>void,backLabel='返回播放'):void{
 shell.openModal('video-interactions',owner=>{
  const panel=document.createElement('section');panel.className='interaction-panel';let access:VideoInteractionAccess|undefined,snapshot:InteractionSnapshot|undefined,busy=false,page=0,initial=initialAction;
  const nodes=new Set<HTMLElement>([panel]);const alive=(o:ResourceOwner)=>!o.signal.aborted&&!owner.signal.aborted&&valid();
  owner.add('interaction-lane',async()=>access?.close());
  const guard=setInterval(()=>{if(!owner.signal.aborted&&!valid()){for(const n of nodes){n.inert=true;n.replaceChildren();}void shell.closeOwnedBranch(owner);}},200);owner.add('interaction-source',()=>clearInterval(guard));
  const h=document.createElement('h2'),status=document.createElement('p'),summary=document.createElement('p'),actions=document.createElement('div'),folders=document.createElement('div');status.setAttribute('role','status');h.textContent='当前账号互动';actions.className=folders.className='interaction-grid';
  const button=(o:ResourceOwner,id:string,label:string,run:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.onclick=()=>{if(alive(o))run();};return b;};
  const back=button(owner,'interaction-back',backLabel,()=>{void shell.back();}),query=button(owner,'interaction-read','读取实际状态 · 不提交',()=>{void read();});
  const prev=button(owner,'interaction-prev','上一组收藏夹',()=>{page--;render();}),next=button(owner,'interaction-next','下一组收藏夹',()=>{page++;render();});
  function render(){
   actions.replaceChildren();folders.replaceChildren();query.disabled=busy;
   const s=snapshot;prev.disabled=busy||page===0;next.disabled=busy||!s||(page+1)*4>=(s.folders?.length??0);if(!s)return;
   h.textContent=s.title;summary.textContent=`${s.bvid} · UP：${s.owner} · 已投${s.coins??'未确认'}/${s.coinLimit}币 · 余额${s.balance??'未确认'}币`;
   for(const f of (s.folders??[]).slice(page*4,page*4+4)){
    const row=document.createElement('div'),fav=button(owner,`interaction-folder-${f.key}`,`${f.selected?'移出':'加入'}收藏夹「${f.title}」`,()=>preview({kind:'favorite',folder:f.key,on:!f.selected}));fav.disabled=busy||s.blocked;row.append(fav);
    folders.append(row);
   }
   if(s.folders===null){const p=document.createElement('p');p.textContent='收藏夹状态未确认；可重新只读查询，其他已读取能力仍可用';folders.append(p);}
  }
  async function read(){if(busy||!alive(owner))return;busy=true;snapshot=undefined;onSnapshot?.(undefined);status.textContent='正在只读核对本人状态和收藏夹，视频继续播放';render();
   try{const result=await(access??=open()).read(owner.signal);if(!alive(owner))return;snapshot=result;onSnapshot?.(result);page=0;status.textContent=result.blocked?'旧操作或本地记录未确认，写操作已锁定；不会自动重发':result.unavailable?`部分状态未确认：${Object.entries(result.unavailable).map(([stage,code])=>`interaction.${stage}.${code}`).join('；')}。已读取项目可独立预览，未确认项目不可提交`:'状态已读取；选择操作后会展示具体目标，尚未提交';}
   catch(e){if(alive(owner))status.textContent=`状态读取未完成（interaction.${e instanceof InteractionReadError?`${e.phase}.${e.code}`:e instanceof DomainError?e.code:'unknown'}），可只读查询或返回`;}
   finally{if(alive(owner)){busy=false;render();if(!panel.contains(document.activeElement)||(document.activeElement as HTMLButtonElement|null)?.disabled)back.focus();const action=initial;initial=undefined;if(action&&snapshot&&!snapshot.blocked){const value=action==='like'?snapshot.liked:action==='follow'?snapshot.followed:snapshot.watchLater;if(value!==null)preview({kind:action,on:!value});}}}
  }
  function preview(operation:VideoOperation){
   if(!snapshot||busy||(operation.kind==='coin'||operation.kind==='triple'))return;const current=snapshot,folder='folder'in operation?current.folders?.find(f=>f.key===operation.folder):undefined;
   shell.openModal('interaction-confirm',child=>{
    const n=document.createElement('section');n.className='interaction-confirm';nodes.add(n);child.add('interaction-node',()=>{nodes.delete(n);});const title=document.createElement('h2'),text=document.createElement('p'),result=document.createElement('p');result.setAttribute('role','status');title.textContent=`确认${labels[operation.kind]}`;
    const direction='on'in operation?(operation.on?'添加':'取消 / 移除'):'';
    text.textContent=`当前账号将对《${current.title}》（${current.bvid}）${operation.kind==='follow'?`的UP「${current.owner}」`:''}执行：${labels[operation.kind]} ${direction}${folder?`「${folder.title}」`:''}。这是账号云端操作；返回不会提交。`;
    const cancel=button(child,'interaction-cancel','取消，不提交',()=>{if(initialAction)void shell.closeOwnedBranch(owner);else void shell.back();}),confirm=button(child,'interaction-confirm','确认本次操作一次',()=>{void submit();}),queryResult=button(child,'interaction-query-result','只读回查，不重发',()=>{void reread();});queryResult.hidden=true;let used=false;
    async function submit(){if(used||busy||!alive(child))return;used=true;busy=true;cancel.textContent='返回互动列表 · 不重发';confirm.disabled=true;queryResult.disabled=true;render();result.textContent='正在提交一次并回查；请勿重复确认';
     try{const value=await access!.submit(current.token,operation,true,child.signal);if(!alive(child))return;snapshot=value.snapshot;onSnapshot?.(snapshot);result.textContent=outcome(value);}
     catch(e){if(alive(child)){snapshot=undefined;onSnapshot?.(undefined);result.textContent=`本次结果未确认（interaction.${e instanceof InteractionReadError?`${e.phase}.${e.code}`:e instanceof DomainError?e.code:'unknown'}）；只读回查，不重发`;}}
     finally{busy=false;if(alive(owner))render();if(alive(child)){confirm.disabled=true;queryResult.hidden=false;queryResult.disabled=false;queryResult.focus();render();}}
    }
    async function reread(){if(busy||!alive(child))return;busy=true;queryResult.disabled=true;try{const s=await access!.read(child.signal);if(alive(child)){snapshot=s;onSnapshot?.(s);result.textContent=`只读结果：${s.liked===null?'点赞未确认':s.liked?'已点赞':'未点赞'}，${s.followed===null?'关注未确认':s.followed?'已关注UP':'未关注UP'}，${s.watchLater===null?'稍后再看未确认':s.watchLater?'在稍后再看':'不在稍后再看'}，已投${s.coins??'未确认'}币${folder?'；各收藏夹状态请返回列表核对':''}。这里只确认当前状态，不证明未知投币由本次产生；不会重发。`;}}catch{if(alive(child))result.textContent='只读回查未确认；本次授权已消耗，不重发';}finally{busy=false;if(alive(owner))render();if(alive(child)){queryResult.disabled=false;}}}
    if(initialAction)shell.modalInput(child,{back(){void shell.closeOwnedBranch(owner);return true;},key(){return false;}});
    n.append(title,text,result,cancel,confirm,queryResult);return n;
   },'interaction-cancel');
  }
  const policy=document.createElement('p');policy.className='interaction-policy';policy.textContent='点赞、关注UP、稍后再看在播放控制栏直接切换；收藏夹按具体目标确认。投币、三连当前暂停。';panel.append(h,status,summary,policy,back,query,actions,folders,prev,next);void read();return panel;
 },'interaction-back');
}
function outcome(value:InteractionOutcome):string{const state={confirmed:'已回查确认',partial:'仅部分操作已确认',unknown:'结果未知，不重发','not-applied':'未确认应用或预览已失效'};return`${state[value.state]}：${value.steps.map(s=>`${labels[s.kind as keyof typeof labels]??s.kind} ${state[s.state]}`).join('；')}。本次确认已使用；不会自动补发。${value.diagnostics?.length?' '+value.diagnostics.join('；'):''}`;}
