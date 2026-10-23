import { DomainError, record } from '../../contracts/src/index.ts';
import {parseSearchKeyword} from '../../contracts/src/search.ts';
/** Public response material only. No account identity, cookie or key persistence. */
export function parsePublicSearchKeys(raw:string):{img:string;sub:string}{
  if(new TextEncoder().encode(raw).length>16384)throw new DomainError('invalid');
  let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}
  const root=record(value),data=record(root.data);
  if(![0,-101].includes(Number(root.code))||typeof root.code!=='number'||data.isLogin!==false)throw new DomainError('invalid');
  return parsePublicWbiImages(data.wbi_img);
}
export function parsePublicWbiImages(value:unknown):{img:string;sub:string}{
  const wbi=record(value);
  const key=(value:unknown)=>{
    if(typeof value!=='string'||value.length>160)throw new DomainError('invalid');
    let url:URL;try{url=new URL(value);}catch{throw new DomainError('invalid');}
    if(url.protocol!=='https:'||!['i0.hdslb.com','i1.hdslb.com','i2.hdslb.com'].includes(url.hostname)||url.port||url.username||url.password||url.search||url.hash||!/^\/bfs\/wbi\/[a-f0-9]{32}\.png$/.test(url.pathname))throw new DomainError('invalid');
    return url.pathname.slice(-36,-4);
  };
  return {img:key(wbi.img_url),sub:key(wbi.sub_url)};
}
/** WBI's defined five-character filtering; the user-facing term remains intact. */
export function searchSigningKeyword(value:unknown):string {
  const result=parseSearchKeyword(value).replace(/[!'()*]/g,'');
  if(!result.length)throw new DomainError('invalid');return result;
}
