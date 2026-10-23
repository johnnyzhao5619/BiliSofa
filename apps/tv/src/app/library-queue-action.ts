import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import type {ResourceOwner} from './resource-owner.ts';
import {queueWriteMessage} from './local-queue.ts';
/** Explicit local copy owned by this summary, never a private network operation. */
export function libraryQueueAction(owner:ResourceOwner,queue:QueueStore|undefined,card:{title:string;kind:string;bvid?:string;part?:number|null},eligible=true):HTMLElement{
 const section=document.createElement('div'),note=document.createElement('p'),status=document.createElement('p'),add=document.createElement('button');
 const part=card.part??1;note.textContent='仅加入当前账号的本机队列，不修改云端列表；播放使用队列所属身份。';status.setAttribute('role','status');
 add.dataset.focusId='library-queue-add';add.textContent=part===1?'加入本机队列 · 首P':`加入本机队列 · P${part}`;add.disabled=!queue||card.kind!=='ugc'||!card.bvid||!eligible;
 if(add.disabled)status.textContent='本条暂不支持本机队列入队';
 add.addEventListener('click',()=>{if(owner.signal.aborted||add.disabled||!queue||!card.bvid)return;const result=queue.add({bvid:card.bvid,title:card.title,part});status.textContent=queueWriteMessage(result);if(result==='saved')add.textContent='已加入本机队列';});
 section.append(note,add,status);return section;
}
