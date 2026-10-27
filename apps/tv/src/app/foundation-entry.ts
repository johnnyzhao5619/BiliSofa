import { activateServiceProfile } from '../../../../packages/contracts/src/service-configuration.ts';
import { serviceCatalog, selectService, savedService, rememberService } from '../platform/service-configuration.ts';
import { exitApplication, isBack } from '../platform/samsung.ts';
import { TvShell } from './tv-shell.ts';
import type { ServiceEntry } from '../platform/service-configuration.ts';

const root = document.querySelector<HTMLElement>('#pages')!, overlays = document.querySelector<HTMLElement>('#overlays')!;
document.body.classList.add('service-configuration');
let handedOff = false, started = false;
async function startApplication(): Promise<void> {
  if (started) return; started = true;
  // Business modules (including endpoint-dependent validators) evaluate only
  // after the selected, packaged backend profile has been activated.
  document.body.classList.remove('service-configuration');
  await import('./foundation-main.ts');
}
async function entry(): Promise<void> {
  let catalog: ServiceEntry[] = [];
  try { catalog = await serviceCatalog(); } catch { /* Show local recovery UI. */ }
  const saved = savedService();
  if (saved && catalog.length) {
    try { const selected = await selectService(saved, catalog); activateServiceProfile(selected.profile); await startApplication(); return; }
    catch { if (started) throw new Error('service.application_start_failed'); }
  }
  const shell = new TvShell(document, root, overlays, (_route, owner) => {
    const panel = document.createElement('section'); panel.className = 'service-setup'; panel.dataset.initialFocusId = 'service-address';
    const brand = document.createElement('p'); brand.className = 'service-brand'; brand.textContent = 'BiliSofa';
    const title = document.createElement('h1'); title.textContent = '连接你要使用的网站';
    const description = document.createElement('p'); description.textContent = '填写网站地址，确认后启用对应配置。尚未配置时，不会访问内容服务。';
    const label = document.createElement('label'); label.htmlFor = 'service-address'; label.textContent = '网站地址';
    const address = document.createElement('input'); address.id = 'service-address'; address.type = 'url'; address.maxLength = 300;
    address.autocomplete = 'off'; address.spellcheck = false; address.placeholder = 'https://www.example.com';
    address.dataset.focusId = 'service-address'; address.dataset.returnFocusId = 'service-enable'; address.dataset.down = 'service-enable';
    const note = document.createElement('p'); note.textContent = '仅支持应用内已有配置的网站。启用后，电视将连接该服务及相应分发网络；这不代表已取得第三方授权。';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    if (!catalog.length) status.textContent = '本地服务目录暂时无法读取，可重新载入。';
    const actions = document.createElement('div'); actions.className = 'service-actions';
    const enable = document.createElement('button'); enable.dataset.focusId = 'service-enable'; enable.textContent = '确认并启用';
    const retry = document.createElement('button'); retry.dataset.focusId = 'service-retry'; retry.textContent = '重新载入配置';
    const exit = document.createElement('button'); exit.dataset.focusId = 'service-exit'; exit.textContent = '退出'; exit.addEventListener('click', exitApplication);
    let busy = false;
    enable.addEventListener('click', () => {
      if (busy || owner.signal.aborted) return;
      busy = true; enable.disabled = true; retry.disabled = true; status.textContent = '正在启用本地配置…';
      void (async () => {
        const selected = await selectService(address.value, catalog, owner.signal);
        if (owner.signal.aborted || document.hidden) return;
        activateServiceProfile(selected.profile);
        const retained = rememberService(selected.host);
        const closed = await shell.dispose();
        if (!closed.closed) throw new Error('service.setup_close_failed');
        handedOff = true; cleanup();
        if (!retained) document.querySelector<HTMLElement>('#feedback')!.textContent = '本次已启用；未能保存网址，下次需重新填写';
        await startApplication();
      })().catch(error => {
        if (handedOff) { root.textContent = '应用启动未完成，请退出后重新打开。'; return; }
        if (owner.signal.aborted) return;
        busy = false; enable.disabled = false; retry.disabled = false;
        status.textContent = error instanceof Error && error.message === 'service.unsupported'
          ? '该网站尚无可用配置，请检查地址。' : '地址无效或本地配置无法读取，请检查后重试。';
        address.focus();
      });
    });
    retry.addEventListener('click', () => {
      if (busy) return; busy = true; retry.disabled = true;
      void serviceCatalog().then(value => { if (!owner.signal.aborted) { catalog = value; status.textContent = '本地目录已载入，请填写网址。'; } })
        .catch(() => { if (!owner.signal.aborted) status.textContent = '本地目录无法读取，请重新安装完整发行包。'; })
        .finally(() => { busy = false; if (!owner.signal.aborted) retry.disabled = false; });
    });
    const buttons = [enable, retry, exit];
    buttons.forEach((button, index) => { button.dataset.up = 'service-address'; button.dataset.down = button.dataset.focusId;
      button.dataset.left = buttons[index - 1]?.dataset.focusId ?? button.dataset.focusId;
      button.dataset.right = buttons[index + 1]?.dataset.focusId ?? button.dataset.focusId; });
    actions.append(...buttons); panel.append(brand, title, description, label, address, note, actions, status); return panel;
  }, isBack, exitApplication);
  const visible = () => { if (handedOff) return; if (document.hidden) void shell.suspend(); else void shell.resume(async () => {}); };
  const leave = () => { if (!handedOff) void shell.dispose(); };
  const cleanup = () => { document.removeEventListener('visibilitychange', visible); globalThis.removeEventListener('pagehide', leave); };
  document.addEventListener('visibilitychange', visible); globalThis.addEventListener('pagehide', leave, { once: true });
  await shell.start();
}
void entry().catch(() => { root.textContent = '无法启动应用，请退出后重新打开。'; });
