import { PUBLIC_CATEGORIES, type CategoryId } from '../../../../packages/contracts/src/categories.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
/** Six items per group; Back closes without changing the current catalog. */
export function categoryPicker(owner:ResourceOwner,shell:TvShell,current:CategoryId|undefined,select:(id:CategoryId)=>void):HTMLElement {
  const section=document.createElement('section');section.className='category-picker';
  const title=document.createElement('h2');title.textContent='选择分区排行榜';section.append(title);
  const status=document.createElement('p');status.setAttribute('role','status');
  const grid=document.createElement('div');grid.className='category-grid';
  const groupCount=Math.ceil(PUBLIC_CATEGORIES.length/6);
  let submitting=false;
  const button=(id:string,label:string,action:()=>void)=>{const n=document.createElement('button');n.dataset.focusId=id;n.textContent=label;n.addEventListener('click',()=>{if(!owner.signal.aborted&&!submitting)action();});return n;};
  let group=current===undefined?0:Math.floor(PUBLIC_CATEGORIES.findIndex(item=>item.id===current)/6);
  const back=button('category-back','返回当前列表',()=>{void shell.back();});
  const previous=button('category-previous','上一组',()=>{group--;render(true);});
  const next=button('category-next','下一组',()=>{group++;render(true);});
  function render(focus:boolean){
    grid.replaceChildren();const rows=PUBLIC_CATEGORIES.slice(group*6,group*6+6);
    status.textContent=`第 ${group+1} / ${groupCount} 组`;previous.disabled=group===0;next.disabled=group===groupCount-1;
    rows.forEach((item,index)=>{
      const node=button(`category-${item.id}`,item.label,()=>{submitting=true;void shell.back().then(()=>{if(!shell.restartRequired)select(item.id);});});
      if(item.id===current)node.setAttribute('aria-current','true');
      const id=(i:number)=>`category-${rows[i]!.id}`;
      node.dataset.left=id(index%2?index-1:index);node.dataset.right=id(index%2===0&&index+1<rows.length?index+1:index);
      node.dataset.up=index<2?'category-back':id(index-2);
      node.dataset.down=index+2<rows.length?id(index+2):!next.disabled?'category-next':!previous.disabled?'category-previous':'category-back';
      grid.append(node);
    });
    if(focus)grid.querySelector<HTMLButtonElement>('button')!.focus();
  }
  section.append(back,status,grid,previous,next);render(false);return section;
}
