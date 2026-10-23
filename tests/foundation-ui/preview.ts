import { DomainError } from '../../packages/contracts/src/index.ts';
import { AccountWorkspace } from '../../apps/tv/src/app/account-workspace.ts';
import type { PrivateAccount, AccountRepository } from '../../packages/contracts/src/private-account.ts';
import { TvShell } from '../../apps/tv/src/app/tv-shell.ts';
import type { PageRoute } from '../../packages/contracts/src/navigation.ts';
import type { ResourceOwner } from '../../apps/tv/src/app/resource-owner.ts';
const root = document.querySelector<HTMLElement>('#pages')!, overlays = document.querySelector<HTMLElement>('#overlays')!;
let workspace: AccountWorkspace | undefined;
let cleanup: 'normal' | 'blocked' | 'failed' = 'normal';
const releases: (() => void)[] = [], dataUpdates: (() => void)[] = [], mounts: string[] = [];
let lastResumeSignal: AbortSignal | undefined;
let releaseResume: (() => void) | undefined;
function button(id: string, label: string, click: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.addEventListener('click', click); return b;
}
function modal(owner: ResourceOwner, nested = false): HTMLElement {
  const node = document.createElement('section'); const title = document.createElement('h2'); title.textContent = nested ? '第二层弹窗' : '第一层弹窗'; title.id = nested ? 'nested-title' : 'modal-title'; node.setAttribute('aria-labelledby', title.id); node.append(title);
  if (!nested) node.append(button('open-nested', '打开第二层', () => shell.openModal('nested', o => modal(o, true))));
  node.append(button(nested ? 'nested-back' : 'modal-back', '返回', () => { void shell.back(); }));
  owner.add('modal-listener', () => {}); return node;
}
const shell = new TvShell(document, root, overlays, (route, owner) => {
  mounts.push(route.page); const node = document.createElement('section'), heading = document.createElement('h2'); heading.textContent = route.page === 'home' ? '首页 · 合成条目' : route.page === 'video' ? '合成详情' : '设置页'; node.append(heading);
  const identity = document.createElement('p'); identity.id = 'current-account'; identity.textContent = workspace?.state.kind === 'active' ? `合成身份 ${workspace.state.account.uid}` : '游客'; node.append(identity);
  owner.add('view-resource', () => { if (cleanup === 'failed') throw Error('synthetic-close-failure'); if (cleanup === 'blocked') return new Promise<void>(yes => releases.push(yes)); });
  if (route.page === 'home') {
    node.append(button('settings', '设置', () => { void shell.navigate({ page: 'settings' }); }));
    node.append(button('synthetic-account-a', '切换合成账号A', () => runAccount(() => workspace!.select('bili_101'))), button('synthetic-account-b', '切换合成账号B', () => runAccount(() => workspace!.select('bili_202'))), button('synthetic-guest', '切换游客', () => runAccount(() => workspace!.select())));
    for (let i = 1; i <= 20; i++) node.append(button('card-' + i, `示例条目 ${i}`, () => { void shell.navigate({ page: 'video', id: 'BV0000000001' }); }));
  } else {
    node.append(button('open-modal', '查看选项', () => shell.openModal('options', o => modal(o))));
    node.append(button('page-back', '返回上一页', () => { void shell.back(); }));
    const text = document.createElement('p'); text.id = 'page-data'; text.textContent = '加载中'; node.append(text);
    dataUpdates.push(() => { if (!owner.signal.aborted) text.textContent = '合成内容 <script>仅作为文字</script>'; });
  }
  return node;
}, e => e.key === 'Escape', () => { document.querySelector('#root-back')!.textContent = '已到首页'; }, 1500);
Object.assign(globalThis, { foundation: {
  mounts, setCleanup(value: typeof cleanup) { cleanup = value; }, release() { for (const done of releases.splice(0)) done(); },
  completeData() { for (const update of dataUpdates.splice(0)) update(); },
  navigate(route: PageRoute) { return shell.navigate(route); }, back: () => shell.back(), accountChanged: () => shell.accountChanged(),
  suspend: () => shell.suspend(), resume: (hold = false) => shell.resume(signal => { lastResumeSignal = signal; return hold ? new Promise<void>(yes => { releaseResume = yes; }) : Promise.resolve(); }),
  resumeAborted: () => !!lastResumeSignal?.aborted, resumeFailure: () => shell.resume(async () => { throw Error('private-revalidation'); }),
  finishResume() { releaseResume?.(); releaseResume = undefined; }, resumeWaiting: () => !!releaseResume,
  dispose: () => shell.dispose(),
} });
void shell.start();

// Synthetic accounts live in memory only. No KeyManager, Bilibili request,
// real login, cookie import, cloud write, or probe identity is involved.
const synthetic = (uid: string): PrivateAccount => ({ schema: 1, id: `bili_${uid}`, uid, name: `合成账号 ${uid}`, expiresAt: Date.now() + 3600000, cookieLines: `.bilibili.com\tTRUE\t/\tTRUE\t9999999999\tSESSDATA\tsynthetic-${uid}\n.bilibili.com\tTRUE\t/\tTRUE\t9999999999\tbili_jct\tsynthetic-csrf\n` });
const savedAccounts = new Map(['101', '202'].map(uid => [`bili_${uid}`, synthetic(uid)]));
const repository: AccountRepository = { list: async () => [...savedAccounts.values()].map(({ cookieLines: _cookie, schema: _schema, ...summary }) => summary), read: async id => savedAccounts.get(id), add: async value => { savedAccounts.set(value.id, value); }, remove: async id => { savedAccounts.delete(id); } };
let verification: 'normal' | 'hold' | 'mismatch' = 'normal';
const checks: { uid: string; signal: AbortSignal; done(value: { uid: string; name: string }): void }[] = [];
let nativeClose: 'normal' | 'hold' | 'failed' = 'normal'; const nativeReleases: (() => void)[] = [];
let creates = 0;
workspace = new AccountWorkspace(shell, repository, value => {
  creates++;
  return { verify: async signal => {
    if (verification === 'hold') return new Promise(yes => checks.push({ uid: value.uid, signal, done: yes }));
    return { uid: verification === 'mismatch' ? '303' : value.uid, name: '合成已核对' };
  }, close: async () => {
    if (nativeClose === 'hold') await new Promise<void>(yes => nativeReleases.push(yes));
    return { closed: nativeClose !== 'failed' };
  } };
}, undefined, 3000);
const accountPanel = document.createElement('aside'); accountPanel.setAttribute('aria-label', '合成账号夹具');
const accountFeedback = document.createElement('p'); accountFeedback.id = 'account-feedback'; accountFeedback.setAttribute('role', 'status');
const runAccount = (action: () => Promise<void>) => { accountFeedback.textContent = '正在处理'; void action().then(() => { accountFeedback.textContent = '完成'; }, () => { accountFeedback.textContent = '身份未确认，请重试或重新登录'; }); };
accountPanel.append(accountFeedback);
document.querySelector('header')!.append(accountPanel);
Object.assign(globalThis, { accountFixture: {
  setVerification(value: typeof verification) { verification = value; }, setClose(value: typeof nativeClose) { nativeClose = value; },
  completeChecks() { for (const check of checks.splice(0)) check.done({ uid: check.uid, name: '合成迟回身份' }); },
  releaseClose() { for (const release of nativeReleases.splice(0)) release(); },
  checks: () => checks.map(c => ({ uid: c.uid, aborted: c.signal.aborted })), creates: () => creates, state: () => workspace!.state,
  hide: () => workspace!.setHidden(true), show: () => workspace!.setHidden(false),
  failAuth: () => workspace!.read(async () => { throw new DomainError('login'); }, String), select: (id: string) => workspace!.select(id), removeA: () => workspace!.remove('bili_101'), dispose: () => workspace!.dispose(),
} });
