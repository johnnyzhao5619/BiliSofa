import type {QueueWrite} from '../../../../packages/contracts/src/local-queue.ts';
export function queueWriteMessage(result:QueueWrite):string{return result==='saved'?'本机队列已保存':result==='deleted'?'本机队列已清空':result==='full'?'本机队列已满（64项），请先移除内容':result==='corrupt'||result==='future'?'本机队列格式不可用，可确认清空后重建':'本机队列保存未确认，请重新读取核查';}
