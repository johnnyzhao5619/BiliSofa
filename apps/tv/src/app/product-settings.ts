import {productOverlaySettings} from './product-overlay-settings.ts';
import type {OverlayPreferenceAccess} from '../../../../packages/contracts/src/overlay-dto.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {productButton} from './product-frame.ts';
/** Rehomes existing settings controls; storage, confirmation and error owners stay intact. */
export function productSettings(owner:ResourceOwner,shell:TvShell,legacy:HTMLElement,overlays:OverlayPreferenceAccess,diagnosticTool?:HTMLButtonElement,diagnosticNote?:HTMLElement,dataExtras:HTMLElement[]=[]):HTMLElement {
  legacy.className='tv-settings';legacy.dataset.initialFocusId='settings-section-playback';
  const heading=legacy.querySelector('h1')!;heading.textContent='设置';
  const layout=document.createElement('div');layout.className='tv-settings-layout';
  const navigation=document.createElement('div');navigation.className='tv-settings-nav';navigation.setAttribute('role','group');navigation.setAttribute('aria-label','设置分类');
  const content=document.createElement('div');content.className='tv-settings-content';
  const groups=[['playback','播放',['local-resume','local-step','local-refresh']],['overlays','字幕与弹幕',[]],['history','搜索记录',['history-recording','history-clear']],['data','本机数据',['local-bookmarks','local-cache','local-clear']],['account','账号',[]],['help','帮助与诊断',['diagnostics']]] as const;
  const status=legacy.querySelector('[role=status]'),notes=[...legacy.querySelectorAll(':scope>p')].filter(p=>p!==status&&!p.hasAttribute('data-write-summary')&&!p.hasAttribute('data-history-status'));
  let selected='playback';const panes=new Map<string,HTMLElement>();
  const sections=groups.map(([id,label,ids])=>{
    const panel=document.createElement('section');panel.id='settings-pane-'+id;const title=document.createElement('h2');title.id=panel.id+'-title';title.textContent=label;panel.setAttribute('aria-labelledby',title.id);panel.append(title);
    for(const controlId of ids){const button=legacy.querySelector<HTMLButtonElement>(`[data-focus-id="${controlId}"]`);if(button)panel.append(button);}
    if(id==='playback'){const note=document.createElement('p');note.textContent='仅保存当前身份的播放偏好，不写入云端。字幕与弹幕可在播放时调整，并保留到下次观看。';panel.append(note,...(status?[status]:[]));}
    if(id==='overlays'){const settings=productOverlaySettings(owner,shell,overlays);panel.append(settings);panel.dataset.columns='2';title.hidden=true;}
    if(id==='history'){const note=legacy.querySelector('[data-history-status]');if(note)panel.append(note);}
    if(id==='data')panel.append(...notes,...dataExtras);
    if(id==='account')panel.append(productButton('settings-account','查看账号与登录',()=>{if(!owner.signal.aborted)void shell.navigateTop({page:'account'});}));
    if(id==='help'){const note=document.createElement('p');note.textContent='诊断不包含登录凭据、二维码或私人播放地址。';const writes=legacy.querySelector('[data-write-summary]');panel.append(note,...(diagnosticNote?[diagnosticNote]:[]),...(writes?[writes]:[]),...(diagnosticTool?[diagnosticTool]:[]));}
    content.append(panel);panes.set(id,panel);
    return productButton('settings-section-'+id,label,()=>{selected=id;render();});
  });
  function render():void {
    sections.forEach((button,i)=>{const id=groups[i]![0],panel=panes.get(id)!;panel.hidden=id!==selected;button.setAttribute('aria-pressed',String(id===selected));button.dataset.left='nav-settings';button.dataset.up=sections[i-1]?.dataset.focusId??button.dataset.focusId;button.dataset.down=sections[i+1]?.dataset.focusId??button.dataset.focusId;
      const actions=[...panel.querySelectorAll<HTMLButtonElement>('button[data-focus-id]:not(:disabled)')];button.dataset.right=actions[0]?.dataset.focusId??button.dataset.focusId;
      actions.forEach((action,j)=>{const cols=panel.dataset.columns==='2'?2:1;action.dataset.left=j%cols?actions[j-1]?.dataset.focusId:button.dataset.focusId;action.dataset.right=j%cols===0&&cols>1?actions[j+1]?.dataset.focusId??action.dataset.focusId:action.dataset.focusId;action.dataset.up=actions[j-cols]?.dataset.focusId??button.dataset.focusId;action.dataset.down=actions[j+cols]?.dataset.focusId??action.dataset.focusId;});
    });
  }
  navigation.append(...sections);layout.append(navigation,content);legacy.replaceChildren(heading,layout);
  const changes=new MutationObserver(render);changes.observe(content,{attributes:true,subtree:true,childList:true,attributeFilter:['disabled']});owner.add('settings-layout',()=>changes.disconnect());render();return legacy;
}
