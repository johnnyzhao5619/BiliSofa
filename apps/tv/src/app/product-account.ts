import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import {productButton} from './product-frame.ts';
/** Existing QR/store/removal handlers retain their owner; only presentation changes. */
export function productAccount(owner:ResourceOwner,shell:TvShell,legacy:HTMLElement,workspace:AccountWorkspace):HTMLElement {
  // Guests start on sign-in; a signed-in viewer starts on the current account.
  legacy.className='tv-account';legacy.dataset.initialFocusId=workspace.state.kind==='active'?'account-details-open':'add-account';
  const title=legacy.querySelector('h1')!;title.textContent='账号';
  const summary=document.createElement('p');summary.className='tv-eyebrow';summary.textContent=workspace.state.kind==='active'?'当前身份：'+workspace.state.account.name:'当前为游客，公开内容与本机队列仍可使用';
  const layout=document.createElement('div');layout.className='tv-account-layout';
  const saved=document.createElement('section'),login=document.createElement('section');saved.className=login.className='tv-account-card';
  const h=document.createElement('h2');h.textContent='电视保存的会话';saved.append(h);
  const list=legacy.querySelector<HTMLElement>('.account-list')!,status=legacy.querySelector<HTMLElement>('[role=status]')!,canvas=legacy.querySelector('canvas')!;
  saved.append(list);
  const actions=document.createElement('div');actions.className='tv-account-actions';
  for(const id of ['account-details-open','renew-account','guest']){const button=legacy.querySelector<HTMLButtonElement>(`[data-focus-id="${id}"]`);if(button){if(id==='account-details-open'&&workspace.state.kind!=='active')button.hidden=true;actions.append(button);}}
  actions.append(productButton('product-account-library','前往我的片库',()=>{if(!owner.signal.aborted)void shell.navigateTop({page:'library'});}));saved.append(actions);
  const loginHeading=document.createElement('h2');loginHeading.textContent='扫码登录';const add=legacy.querySelector<HTMLButtonElement>('[data-focus-id=add-account]')!;add.textContent='获取登录二维码';
  if(workspace.state.kind!=='active'&&add.disabled)legacy.dataset.initialFocusId='product-account-library';
  if(workspace.recovery){loginHeading.textContent='更新登录会话';add.textContent='重新扫码并返回原页面';legacy.dataset.initialFocusId='guest';}
  const note=document.createElement('p');note.textContent=(workspace.recovery?'请使用原来的账号扫码。本机队列、续播、设置与未确认操作记录会保留；不会自动播放或重发操作。':'')+'用官方哔哩哔哩 App 扫码并在手机确认。凭据只保存在电视保护存储；返回或Home会取消本次扫码。';
  login.append(loginHeading,note,add,status,canvas);layout.append(saved,login);legacy.replaceChildren(title,summary,layout);
  function wire():void {
    const rows=[...list.children] as HTMLElement[];
    const activeId=workspace.state.kind==='active'?workspace.state.account.id:undefined;
    const chosen=rows.find(row=>activeId&&row.querySelector(`[data-focus-id="use-${activeId}"]`))??rows[0];
    // Preserve old slots without presenting a dual-account workflow in this delivery.
    rows.forEach(row=>{row.hidden=row!==chosen;row.className='tv-account-saved';});
    const left=[...saved.querySelectorAll<HTMLButtonElement>('button[data-focus-id]:not(:disabled)')].filter(b=>!b.closest('[hidden]'));
    const right=[add].filter(b=>!b.disabled);
    left.forEach((b,i)=>{b.dataset.left='nav-account';b.dataset.right=right[0]?.dataset.focusId??b.dataset.focusId;b.dataset.up=left[i-1]?.dataset.focusId??b.dataset.focusId;b.dataset.down=left[i+1]?.dataset.focusId??b.dataset.focusId;});
    add.dataset.left=left[0]?.dataset.focusId??'nav-account';add.dataset.right=add.dataset.focusId;add.dataset.up=add.dataset.down=add.dataset.focusId;
  }
  const observer=new MutationObserver(wire);observer.observe(list,{childList:true,subtree:true});observer.observe(add,{attributes:true,attributeFilter:['disabled']});owner.add('account-layout',()=>observer.disconnect());wire();return legacy;
}
