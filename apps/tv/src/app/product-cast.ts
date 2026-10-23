import {castIdentity,castInstructions} from './cast-visuals.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import {castEntry} from './cast-entry.ts';
/** Presentation only. Listening remains an explicit castEntry-owned session. */
export function productCast(owner:ResourceOwner,shell:TvShell,feedback:HTMLElement,jumpSeconds:number,diagnostics:AppDiagnostics):HTMLElement{
  const node=document.createElement('section');node.className='tv-cast-destination';node.dataset.initialFocusId='cast-entry';
  const heading=document.createElement('h1');heading.textContent='投屏';const layout=document.createElement('div');layout.className='tv-cast-layout';
  const receiver=document.createElement('div');receiver.className='tv-cast-receiver';const status=document.createElement('p');status.className='tv-cast-state';status.textContent='接收未开启';
  const note=document.createElement('p');note.className='tv-cast-hint';note.textContent='开始接收后，在手机选择这台电视。';
  const entry=castEntry(owner,shell,feedback,jumpSeconds,diagnostics);entry.textContent='开始接收';entry.className='tv-primary';entry.dataset.left='nav-cast';entry.dataset.right=entry.dataset.up=entry.dataset.down='cast-entry';
  const privacy=document.createElement('p');privacy.className='tv-cast-hint';privacy.textContent='仅当前台允许时接收；Home或结束会话会停止。手机账号与电视账号独立。';
  receiver.append(castIdentity(),status,note,entry,privacy);layout.append(receiver,castInstructions());node.append(heading,layout);return node;
}
