import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {LiveReadFailure,type LiveAccess,type LiveMessage} from '../../../../packages/contracts/src/live-product.ts';
import type {ResourceOwner} from './resource-owner.ts';
/** Bounded official recent-message polling. This is labeled as a recent-message
 * view, not a complete WebSocket log or a VOD-synchronized timeline. */
export function liveMessages(owner:ResourceOwner,open:()=>LiveAccess,roomId:string,intervalMs=5000):HTMLElement {
  if(!Number.isInteger(intervalMs)||intervalMs<1000||intervalMs>30000)throw new DomainError('invalid');
  const panel=document.createElement('section');panel.className='live-message-panel';const title=document.createElement('h3'),status=document.createElement('p'),list=document.createElement('div'),refresh=document.createElement('button');title.textContent='直播弹幕 · 近期消息';status.setAttribute('role','status');list.setAttribute('role','log');list.setAttribute('aria-live','off');list.tabIndex=0;list.dataset.focusId='live-message-list';refresh.dataset.focusId='live-message-refresh';refresh.textContent='刷新近期消息';
  const access=open(),seen=new Set<string>();let rows:LiveMessage[]=[],timer:ReturnType<typeof setTimeout>|undefined,busy=false,errors=0;
  const hint=document.createElement('p');hint.className='live-message-hint';hint.textContent='只读；定时读取源端近期消息，可能遗漏高密度消息，不按视频进度重播';
  async function poll(manual=false){
    if(busy||owner.signal.aborted)return;clearTimeout(timer);busy=true;refresh.disabled=true;if(manual)errors=0;
    try{
      const result=await access.messages(roomId,owner.signal);if(owner.signal.aborted)return;
      const added=result.items.filter(item=>!seen.has(item.key));for(const item of added)seen.add(item.key);while(seen.size>200)seen.delete(seen.values().next().value!);
      if(added.length){rows=[...rows,...added].sort((a,b)=>a.atMs-b.atMs).slice(-12);list.replaceChildren();for(const row of rows){const p=document.createElement('p');p.textContent=`${row.author}：${row.body}`;list.append(p);}}
      errors=0;const message=rows.length?'近期消息已更新':'源端暂未返回近期消息';if(status.textContent!==message)status.textContent=message;timer=setTimeout(()=>{void poll();},intervalMs);
    }catch(error){
      if(owner.signal.aborted)return;errors++;const code=error instanceof DomainError?error.code:'unknown';const retryable=['network','timeout'].includes(code)&&!(error instanceof LiveReadFailure&&error.apiCode!==undefined);
      status.textContent=`近期消息读取失败（live.${code}）${rows.length?'，保留此前消息':''}；${retryable&&errors<3?'稍后有限重试':'可手动刷新'}`;
      if(retryable&&errors<3)timer=setTimeout(()=>{void poll();},intervalMs*2**errors);
    }finally{busy=false;if(!owner.signal.aborted)refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>{void poll(true);});owner.add('live-message-reader',async()=>{clearTimeout(timer);rows=[];seen.clear();list.replaceChildren();await access.close();});
  panel.append(title,hint,status,list,refresh);void poll();return panel;
}
