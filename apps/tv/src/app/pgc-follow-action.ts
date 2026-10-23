import type {PgcSeason} from '../../../../packages/contracts/src/pgc-season.ts';
import type {PgcFollows} from './pgc-follows.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
/** Every real write has a concrete season/direction preview and one disabled-on-
 * dispatch confirmation. Unknown outcomes offer reads, never an automatic retry. */
export function pgcFollowAction(owner:ResourceOwner,shell:TvShell,season:PgcSeason,follows:PgcFollows,updated:(state:'yes'|'no'|'unknown')=>void):HTMLElement {
 const panel=document.createElement('section');panel.className='pgc-follow-confirm';
 const heading=document.createElement('h2'),message=document.createElement('p');heading.textContent=season.title;message.setAttribute('role','status');
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 let state:'yes'|'no'|'unknown'='unknown',busy=false,desired=false;
 const back=button('pgc-follow-back','返回详情',()=>{void shell.back();});
 const query=button('pgc-follow-query','查询实际状态 · 不重发',()=>{void read();});
 const confirm=button('pgc-follow-confirm','等待读取状态',()=>{if(busy||state==='unknown')return;void write();});confirm.disabled=true;
 function show(value:'yes'|'no'|'unknown',afterWrite=false){state=value;updated(value);desired=value!=='yes';confirm.disabled=value==='unknown'||afterWrite;confirm.textContent=desired?'确认追番一次':'确认取消追番一次';
  message.textContent=value==='unknown'?'实际状态未确认；请只读查询，不要重复提交':afterWrite?`已回查：当前账号${value==='yes'?'已追番':'未追番'}；如需反向操作，请返回详情重新确认`:`当前账号${value==='yes'?'已追番':'未追番'}。确认后将${desired?'追番':'取消追番'}《${season.title}》（ss${season.seasonId}），会修改此账号的云端追番列表。`;
 }
 async function read(){if(busy||owner.signal.aborted)return;busy=true;confirm.disabled=query.disabled=true;message.textContent='正在只读回查本人追番状态';try{const result=await follows.state(season.seasonId);if(!owner.signal.aborted)show(result);}catch{if(!owner.signal.aborted)show('unknown');}finally{busy=false;if(!owner.signal.aborted){query.disabled=false;const current=document.activeElement;if(!panel.contains(current)||(current instanceof HTMLButtonElement&&current.disabled))back.focus();}}}
 async function write(){busy=true;confirm.disabled=query.disabled=true;message.textContent='正在提交一次并回查；离开后不会自动重发';try{const result=await follows.set(season.seasonId,desired,true);if(!owner.signal.aborted)show(result,true);}catch{if(!owner.signal.aborted)show('unknown');}finally{busy=false;if(!owner.signal.aborted){confirm.disabled=true;query.disabled=false;query.focus();}}}
 panel.append(heading,message,back,query,confirm);void read();return panel;
}
