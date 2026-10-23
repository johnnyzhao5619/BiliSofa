import type { PageRoute } from '../../../../packages/contracts/src/navigation.ts';
import type { TvShell } from './tv-shell.ts';
import type { ResourceOwner } from './resource-owner.ts';
const destinations = [['home', '首页', 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z'], ['search', '搜索', 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l7 7'], ['following', '关注', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 8v6m-3-3h6'], ['catalog', '番剧影视', 'm3 3 18 9-18 9Z'], ['library', '我的', 'M4 3h16v18H4ZM8 7h8M8 11h8M8 15h5'], ['cast', '投屏', 'M3 9V3h18v18h-6M3 15a6 6 0 0 1 6 6M3 11a10 10 0 0 1 10 10M3 19v2h2'], ['account', '账号', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 6 0 0 1 16 0v2'], ['settings', '设置', 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6']] as const;
export function productButton(id: string, label: string, action: () => void): HTMLButtonElement { const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.onclick = action; return b; }
/** Pages with an inner level (e.g. home grid opened from a shelf) register their own Back step. */
export const frameBack = new WeakMap<HTMLElement, () => boolean>();
export function productFrame(owner: ResourceOwner, shell: TvShell, route: PageRoute, content: HTMLElement, contentBack?:()=>boolean): HTMLElement {
    contentBack ??= frameBack.get(content);
    const frame = document.createElement('section');
    frame.className = 'tv-frame';
    frame.dataset.initialFocusId = content.dataset.initialFocusId??'nav-' + route.page;
    const rail = document.createElement('nav');
    rail.className = 'tv-rail';
    rail.setAttribute('aria-label', '主导航');
    const brand = document.createElement('div');
    brand.className = 'tv-brand';
    brand.textContent = 'B';
    brand.setAttribute('aria-label', 'BiliSofa');
    rail.append(brand);
    const buttons = destinations.map(([page, label, path], i) => {
        const b = productButton('nav-' + page, label, () => { if (!owner.signal.aborted && page !== route.page)
            void shell.navigateTop({ page }, contentAnchor); });
        const text = document.createElement('span');
        text.textContent = label;
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        const p = document.createElementNS(icon.namespaceURI, 'path');
        p.setAttribute('d', path);
        icon.append(p);
        b.replaceChildren(icon, text);
        b.setAttribute('aria-label', label);
        b.dataset.left = b.dataset.focusId;
        b.dataset.up = 'nav-' + destinations[Math.max(0, i - 1)]![0];
        b.dataset.down = 'nav-' + destinations[Math.min(destinations.length - 1, i + 1)]![0];
        if (page === route.page)
            b.setAttribute('aria-current', 'page');
        return b;
    });
    rail.append(...buttons);
    const region = document.createElement('div');
    region.className = 'tv-content';
    region.append(content);
    frame.append(rail, region);
    let contentAnchor = '';
    const available = () => [...region.querySelectorAll<HTMLElement>('[data-focus-id]')].filter(el => !el.closest('[hidden],[inert]') && !el.matches(':disabled') && el.getClientRects().length>0);
    const target = () => { const targets=available();return targets.find(el=>el.dataset.focusId===contentAnchor)??targets.find(el=>el.dataset.focusId===content.dataset.initialFocusId)??targets[0]; };
    const focused = (event: FocusEvent) => { const element = event.target as HTMLElement; if (region.contains(element) && element.dataset.focusId)
        contentAnchor = element.dataset.focusId; const id = target()?.dataset.focusId || 'nav-' + route.page; for (const b of buttons)
        b.dataset.right = id; };
    frame.addEventListener('focusin', focused);
    owner.add('product-focus', () => frame.removeEventListener('focusin', focused));
    shell.pageInput(owner, { key(event) { if(rail.contains(document.activeElement)&&(['ArrowRight','Right'].includes(event.key)||event.keyCode===39)){target()?.focus();return true;}return false; }, back() { if(contentBack?.())return true; if (!rail.contains(document.activeElement)) {
            buttons.find(b => b.dataset.focusId === 'nav-' + route.page)?.focus();
            return true;
        } if (route.page !== 'home') {
            void shell.navigateTop({ page: 'home' }, contentAnchor);
            return true;
        } return false; } });
    return frame;
}
