import type { ResourceOwner } from './resource-owner.ts';
import { productButton } from './product-frame.ts';
import { visitorIds, type VisitorIds } from '../platform/visitor-id.ts';
/** 设置 → 本机数据 (ADR-106): whether B站's visitor identity is kept on this TV, and one press to forget it. Fixed words only. */
export function visitorSettings(owner: ResourceOwner, ids: VisitorIds = visitorIds()): HTMLElement[] {
  const note = document.createElement('p'); note.dataset.visitorStatus = '';
  const show = (text?: string) => { note.textContent = text ?? (ids.saved() ? '游客浏览分区与UP投稿时使用的B站访客标识：已保存在本机（30天内有效）' : '游客浏览分区与UP投稿时使用的B站访客标识：未保存，需要时自动获取'); };
  const button = productButton('visitor-clear', '清除B站访客标识', () => {
    if (owner.signal.aborted) return;
    if (!ids.saved()) { show('本机没有保存B站访客标识'); return; }
    const result = ids.clear();
    show(result === 'deleted' ? '已清除B站访客标识，下次游客读取时重新获取' : '未能确认清除，请稍后再试');
  });
  show();
  return [button, note];
}
