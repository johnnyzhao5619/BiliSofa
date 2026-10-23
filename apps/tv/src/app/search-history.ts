import type {SearchHistoryStore} from '../../../../packages/contracts/src/search-history.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {localReadIssue} from './local-settings.ts';
/** Display only the selected local partition; no network until a term is selected. */
export function historyPanel(owner:ResourceOwner,shell:TvShell,history:SearchHistoryStore,accepted:(term:string)=>void):HTMLElement {
  const section=document.createElement('section');section.className='history-panel';const heading=document.createElement('h2');heading.id='history-title';heading.textContent='当前身份的搜索历史';section.setAttribute('aria-labelledby',heading.id);
  const status=document.createElement('p');status.setAttribute('role','status');const list=document.createElement('div');list.className='history-terms';
  const b=(id:string,text:string,action:()=>void)=>{const node=document.createElement('button');node.dataset.focusId=id;node.textContent=text;node.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return node;};
  let page=0,selected=false;
  const back=b('history-back','返回',()=>{void shell.back();}),previous=b('history-previous','上一组',()=>{page--;render();}),next=b('history-next','下一组',()=>{page++;render();});
  function render():void{
    if(owner.signal.aborted)return;const result=history.read();list.replaceChildren();previous.disabled=next.disabled=true;
    if(result.kind!=='ok'){status.textContent=localReadIssue(result.kind);back.focus();return;}
    const {enabled,terms}=result.value;page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(terms.length/6)-1)));previous.disabled=page===0;next.disabled=(page+1)*6>=terms.length;
    status.textContent=terms.length?`${enabled?'记录已开启':'记录已关闭，已有历史仍保留'} · ${terms.length} 词 · 第 ${page+1} 页`:enabled?'尚无搜索历史':'记录已关闭，尚无历史';
    terms.slice(page*6,(page+1)*6).forEach((term,i)=>{const node=b('history-term-'+i,'搜索：'+term,()=>{if(selected)return;selected=true;void shell.back().then(()=>{if(!shell.restartRequired)accepted(term);});});
      node.dataset.left=i%2?'history-term-'+(i-1):'history-term-'+i;node.dataset.right=i%2===0&&i+1<Math.min(6,terms.length-page*6)?'history-term-'+(i+1):'history-term-'+i;
      node.dataset.up=i<2?'history-back':'history-term-'+(i-2);node.dataset.down=i+2<Math.min(6,terms.length-page*6)?'history-term-'+(i+2):next.disabled?'history-back':'history-next';list.append(node);
    });
    if(section.isConnected)(list.querySelector<HTMLButtonElement>('button')??back).focus();
  }
  section.append(heading,back,previous,next,status,list);render();return section;
}
