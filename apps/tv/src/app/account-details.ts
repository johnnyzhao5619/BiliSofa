import type {AccountSummary} from '../../../../packages/contracts/src/private-account.ts';
import type {AccountProfile} from '../../../../packages/contracts/src/account-profile.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
/** Uses only the verified generation's display snapshot, without starting a request. */
export function accountDetails(owner:ResourceOwner,shell:TvShell,account:AccountSummary,profile?:AccountProfile):HTMLElement{
 const panel=document.createElement('section');panel.className='account-details-panel';const heading=document.createElement('h2');heading.id='account-details-heading';heading.textContent='当前账号详情';panel.setAttribute('aria-labelledby',heading.id);
 const name=document.createElement('p');name.textContent='昵称：'+account.name;
 const uid=document.createElement('p');uid.textContent='UID：'+account.uid;
 const level=document.createElement('p');level.textContent='等级：'+(profile?.level===null||profile?.level===undefined?'源端未提供':'Lv'+profile.level);
 const vip=document.createElement('p');const kind=profile?.vipType===2?'年度大会员':profile?.vipType===1?'大会员':undefined;
 vip.textContent='会员状态：'+(profile?.vipStatus===1&&kind?'生效 · '+kind:profile?.vipStatus===0?'未生效'+(kind?' · '+kind:''):profile?.vipType===0&&profile?.vipStatus!==1?'非大会员':'源端未提供或状态不一致');
 const expiry=document.createElement('p');expiry.textContent='本机保存的会话期限：'+new Date(account.expiresAt).toLocaleString('zh-CN');
 const note=document.createElement('p');note.textContent='显示最近一次身份核对结果；具体视频和画质仍按实际权益判断。';
 const back=document.createElement('button');back.dataset.focusId='account-details-back';back.textContent='返回账号管理';back.addEventListener('click',()=>{if(!owner.signal.aborted)void shell.back();});panel.append(heading,name,uid,level,vip,expiry,note,back);return panel;
}
