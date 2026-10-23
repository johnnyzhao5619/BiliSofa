import { parseMediaFailure } from '../../../../packages/contracts/src/media-failure.ts';
export function mediaFailureFeedback(value: unknown): string {
  let fault;try{fault=parseMediaFailure(value);}catch{return '播放失败，可返回后重试';}
  const code=fault.sourceCode??`${fault.phase}.${fault.reason}`;
  if(fault.sourceCode==='ugc.native_unavailable')return `当前环境不支持内容网络（${code}）`;
  if(fault.phase==='source' && fault.reason==='unsupported')return `此视频当前无法使用游客播放，请选其他视频（${code}）`;
  const stage=fault.phase==='source'?'播放源读取':fault.phase==='prepare'?'播放器准备':fault.phase==='seek'?'播放定位':'播放';
  return `${stage}失败，可返回后重试（${code}）`;
}
