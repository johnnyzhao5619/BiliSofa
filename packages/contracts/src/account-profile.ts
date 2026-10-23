import {DomainError,record} from './index.ts';
/** Display-only verification snapshot. No account identifier, credential or URL. */
export interface AccountProfile {level:number|null;vipStatus:0|1|null;vipType:0|1|2|null;}
export function parseAccountProfile(value:unknown):AccountProfile{
 const v=record(value);
 if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['level','vipStatus','vipType'].includes(k))||v.level!==null&&(!Number.isInteger(v.level)||Number(v.level)<0||Number(v.level)>6)||![null,0,1].includes(v.vipStatus as null|number)||![null,0,1,2].includes(v.vipType as null|number))throw new DomainError('invalid');
 return {level:v.level as number|null,vipStatus:v.vipStatus as AccountProfile['vipStatus'],vipType:v.vipType as AccountProfile['vipType']};
}
