import type { AccountSummary } from '../../../../packages/contracts/src/private-account.ts';
import type { TvShell } from './tv-shell.ts';
import { productButton } from './product-frame.ts';

const LAST_KEY = 'bilisofa.last-profile.v1', GUEST_KEY = 'bilisofa.launch-guest.v1';
// Same outline icons as the nav rail (账号) plus a plus sign, so the picker reads as part of the product.
const GUEST_ICON = 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 6 0 0 1 16 0v2', ADD_ICON = 'M12 5v14M5 12h14';
function icon(path: string): SVGSVGElement { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', path); svg.append(p); return svg; }
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string | undefined) => { try { if (value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* best effort */ } };
/** Only the chosen account id is kept, never credentials (ADR-099). */
export function rememberProfile(id: string | undefined): void { write(LAST_KEY, id); if (id) write(GUEST_KEY, undefined); }
export function forgetProfile(id: string): void { if (read(LAST_KEY) === id) write(LAST_KEY, undefined); }

export interface LaunchChooser {
  accounts(): Promise<AccountSummary[]>;
  /** Verifies and activates an account (or the guest when undefined); resolves to whether it is now active. */
  use(id?: string): Promise<boolean>;
  /** Opens the account page for a QR sign-in. */
  addAccount(): void;
}
/** Cold-start “谁在观看？” (ADR-099), modelled on TV clients' profile pickers: one card per saved
 * account (ready for more slots), 游客浏览 and 添加账号. With no saved account a one-time welcome
 * offers sign-in or guest browsing. Back keeps the guest. Nothing private is read before a choice. */
export async function openLaunchChooser(shell: TvShell, chooser: LaunchChooser, now = Date.now): Promise<void> {
  const accounts = await chooser.accounts().catch(() => [] as AccountSummary[]);
  if (!accounts.length && read(GUEST_KEY) === '1') return;
  const last = read(LAST_KEY), initial = accounts.find(a => a.id === last) ?? accounts[0];
  shell.openModal('launch-chooser', owner => {
    const panel = document.createElement('section'), brand = document.createElement('div'), eyebrow = document.createElement('p'), heading = document.createElement('h1'), lead = document.createElement('p'), row = document.createElement('div'), status = document.createElement('p');
    panel.className = 'tv-launch'; row.className = 'tv-launch-row'; status.className = 'tv-secondary tv-launch-status'; status.setAttribute('role', 'status');
    brand.className = 'tv-brand tv-launch-brand'; brand.textContent = 'B'; brand.setAttribute('aria-hidden', 'true');
    eyebrow.className = 'tv-eyebrow'; eyebrow.textContent = 'BiliSofa · 坐下来，看点喜欢的';
    heading.textContent = accounts.length ? '谁在观看？' : '欢迎使用 BiliSofa';
    lead.textContent = accounts.length ? '选择账号继续，或先以游客浏览。之后可在“账号”中切换。' : '扫码登录后可看推荐、追番和云端记录；也可以先以游客浏览。';
    let busy = false;
    const close = () => { void shell.closeOwnedModal(owner); };
    const card = (id: string, name: string, hint: string, action: () => void, path?: string) => {
      const b = productButton(id, '', () => { if (!busy && !owner.signal.aborted) action(); });
      const avatar = document.createElement('span'), label = document.createElement('span'), note = document.createElement('span');
      avatar.className = path ? 'tv-launch-avatar tv-launch-icon' : 'tv-launch-avatar'; if (path) avatar.append(icon(path)); else avatar.textContent = Array.from(name)[0] ?? '?'; avatar.setAttribute('aria-hidden', 'true');
      label.className = 'tv-launch-name'; label.textContent = name; note.className = 'tv-launch-hint'; note.textContent = hint;
      b.className = 'tv-launch-card'; b.append(avatar, label, note); b.setAttribute('aria-label', hint ? `${name}，${hint}` : name); return b;
    };
    const cards = accounts.map(account => card('launch-account-' + account.id, account.name, account.expiresAt <= now() ? '需要重新扫码' : account.id === last ? '上次使用' : '', async () => {
      busy = true; status.textContent = `正在核对 ${account.name} 的登录…`;
      const active = await chooser.use(account.id).catch(() => false);
      busy = false; if (owner.signal.aborted) return;
      if (active) { rememberProfile(account.id); close(); return; }
      status.textContent = `${account.name} 的登录已失效，请选“添加账号”重新扫码，或先以游客浏览`;
    }));
    const guest = card('launch-guest', '游客浏览', '公开内容与本机队列', () => { if (!accounts.length) write(GUEST_KEY, '1'); close(); }, GUEST_ICON);
    const add = card('launch-add', accounts.length ? '添加账号' : '扫码登录', '用哔哩哔哩 App 扫码', () => { close(); chooser.addAccount(); }, ADD_ICON);
    const all = [...cards, guest, add];
    all.forEach((b, i) => { b.dataset.left = all[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = all[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = b.dataset.down = b.dataset.focusId; });
    row.append(...all); panel.append(brand, eyebrow, heading, lead, row, status);
    panel.dataset.initialFocusId = initial ? 'launch-account-' + initial.id : 'launch-add';
    return panel;
  }, initial ? 'launch-account-' + initial.id : 'launch-add');
}
