import type {ResourceOwner} from '../app/resource-owner.ts';
/** Direction graph only; the existing shell and reading owner retain all key handling. */
export function productPanel(owner:ResourceOwner,node:HTMLElement):void {
  if(!node.matches('.vod-picker,.pgc-season-panel,.overlay-settings,.comments-panel,.comment-detail-panel,.diagnostics-panel,.account-details-panel,.interaction-panel,.interaction-confirm'))return;
  const wire=()=>{
    const visible=(el:HTMLElement)=>!el.closest('[hidden]')&&!el.matches(':disabled');
    const buttons=[...node.querySelectorAll<HTMLElement>('[data-focus-id]')].filter(visible);
    const grid=node.querySelector<HTMLElement>('.vod-grid,.pgc-episode-grid,.comments-grid,.interaction-grid,.player-settings-list');
    const cards=grid?[...grid.querySelectorAll<HTMLElement>('[data-focus-id]')].filter(visible):[];
    const tools=buttons.filter(b=>!grid?.contains(b));
    const back=tools.find(b=>/back|keep|cancel/.test(b.dataset.focusId??''))??tools[0];
    tools.forEach((b,i)=>{b.dataset.left=tools[i-1]?.dataset.focusId??b.dataset.focusId;b.dataset.right=tools[i+1]?.dataset.focusId??b.dataset.focusId;b.dataset.up=cards.at(-1)?.dataset.focusId??b.dataset.focusId;b.dataset.down=cards[0]?.dataset.focusId??tools[i+1]?.dataset.focusId??b.dataset.focusId;});
    // Single-column lists: rate choices, 0.47 comment reading and stepper settings (Left/Right belong to the row).
    // ⚙ settings list too: treating it as toolbar buttons made every Up point at itself.
    if(grid?.classList.contains('vod-rate-list')||node.matches('.comments-reading,.overlay-stepper,.player-settings')){cards.forEach((b,i)=>{b.dataset.left=b.dataset.right=b.dataset.focusId;b.dataset.up=cards[i-1]?.dataset.focusId??back?.dataset.focusId??b.dataset.focusId;b.dataset.down=cards[i+1]?.dataset.focusId??back?.dataset.focusId??b.dataset.focusId;});return;}
    cards.forEach((b,i)=>{b.dataset.left=i%2?cards[i-1]?.dataset.focusId:back?.dataset.focusId;b.dataset.right=i%2===0?cards[i+1]?.dataset.focusId??b.dataset.focusId:b.dataset.focusId;b.dataset.up=cards[i-2]?.dataset.focusId??back?.dataset.focusId;b.dataset.down=cards[i+2]?.dataset.focusId??back?.dataset.focusId;});
  };
  wire();const observer=new MutationObserver(wire);observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden']});owner.add('product-panel-focus',()=>observer.disconnect());
}
