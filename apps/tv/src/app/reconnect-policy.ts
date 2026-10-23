declare const BILISOFA_MEDIA_RECONNECT:boolean;
/** 0.50.2 bounded automatic reconnect after a network/timeout playback failure (ADR-100); older variants keep their frozen behaviour. */
export const MEDIA_RECONNECT=typeof BILISOFA_MEDIA_RECONNECT!=='undefined'&&BILISOFA_MEDIA_RECONNECT;
/** At most two attempts within two minutes; each waits a little longer and resumes two seconds early. */
export const RECONNECT_LIMIT=2, RECONNECT_WINDOW_MS=120000, RECONNECT_REWIND_MS=2000;
export function reconnectPlan(failedReason:string|undefined,closed:boolean,attempts:number,lastAt:number,now:number,timeMs:number):{attempt:number;delayMs:number;resumeMs:number}|undefined{
  if(!closed||(failedReason!=='network'&&failedReason!=='timeout'))return undefined;
  const used=now-lastAt>RECONNECT_WINDOW_MS?0:attempts;
  if(used>=RECONNECT_LIMIT)return undefined;
  const attempt=used+1;return {attempt,delayMs:1500*attempt,resumeMs:Math.max(0,Math.round(timeMs)-RECONNECT_REWIND_MS)};
}
