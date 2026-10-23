import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {PgcFollowCard} from '../../../../packages/contracts/src/pgc-follow-dto.ts';
import type {PgcFollows} from './pgc-follows.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
export function pgcFollowList(owner:ResourceOwner,shell:TvShell,access:PgcFollows,open:(card:PgcFollowCard)=>void):HTMLElement {
 const panel=document.createElement('section');panel.className='pgc-follow-list';const heading=document.createElement('h2'),status=document.createElement('p'),grid=document.createElement('div');grid.className='pgc-follow-grid';status.setAttribute('role','status');status.tabIndex=-1;
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 let type:1|2=1,page=1,busy=false;
 const back=button('pgc-list-back','返回账号管理',()=>{void shell.back();});
 const toggle=button('pgc-list-type','切换到追剧',()=>{void read(1,type===1?2:1);});
 const refresh=button('pgc-list-refresh','刷新追番列表',()=>{void read(1,type);});
 const previous=button('pgc-list-previous','上一页',()=>{if(page>1)void read(page-1,type);});const next=button('pgc-list-next','下一页',()=>{if(page<25000)void read(page+1,type);});previous.disabled=next.disabled=true;
 async function read(target:number,category:1|2){
  if(busy||owner.signal.aborted)return;busy=true;toggle.disabled=refresh.disabled=previous.disabled=next.disabled=true;grid.replaceChildren();heading.textContent=category===1?'我的追番':'我的追剧';status.textContent='正在读取当前账号列表';status.focus();
  try{const result=await access.list({type:category,page:target});if(owner.signal.aborted)return;type=category;page=result.page;status.textContent=result.items.length?`第${page}页 · 源端共${result.total}项`:'当前列表为空';previous.disabled=page===1;next.disabled=result.noMore||page===25000;toggle.textContent=type===1?'切换到追剧':'切换到追番';
   result.items.forEach((card,i)=>{const node=button('pgc-list-'+i,`${card.title}${card.status?' · '+card.status:''}${card.progress?' · '+card.progress:''}`,()=>{if(!busy)open(card);}),id=(j:number)=>'pgc-list-'+j;node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'pgc-list-refresh':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'pgc-list-next':'pgc-list-back';grid.append(node);});
  }catch(error){if(!owner.signal.aborted)status.textContent=`追番列表读取失败（pgc.${error instanceof DomainError?error.code:'unknown'}），可返回或手动刷新`;}
  finally{busy=false;if(!owner.signal.aborted){toggle.disabled=refresh.disabled=false;(grid.querySelector<HTMLButtonElement>('button')??refresh).focus();}}
 }
 panel.append(heading,back,toggle,refresh,status,grid,previous,next);void read(1,1);return panel;
}
