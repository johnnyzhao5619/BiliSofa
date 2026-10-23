import {parseAccountProfile,type AccountProfile} from '../../contracts/src/account-profile.ts';
/** Optional nav display fields never invalidate an otherwise verified identity. */
export function navAccountProfile(data:Record<string,unknown>):AccountProfile{
 const info=data.level_info,level=info&&typeof info==='object'&&!Array.isArray(info)?(info as Record<string,unknown>).current_level:undefined;
 return parseAccountProfile({level:Number.isInteger(level)&&Number(level)>=0&&Number(level)<=6?level:null,vipStatus:data.vipStatus===0||data.vipStatus===1?data.vipStatus:null,vipType:data.vipType===0||data.vipType===1||data.vipType===2?data.vipType:null});
}
