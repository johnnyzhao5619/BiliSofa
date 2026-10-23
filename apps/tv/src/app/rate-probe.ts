import type { VodAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { PlaybackRate } from '../../../../packages/contracts/src/playback-rate.ts';
import { VodCatalogMedia } from '../../../../packages/media/src/vod-catalog-media.ts';
import { ElementVideoBackend } from '../platform/element-video.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { productButton } from './product-frame.ts';

// 1× first while the buffer is fresh; v2 (ADR-096) adds 0.25× and 2× and counts waiting events.
const RATES: PlaybackRate[] = [1, 0.25, 0.5, 0.75, 1.25, 1.5, 2];
/** Adjacent rates differ by 0.25, so a judged slope must stay within less than half of that (ADR-087). */
const TOLERANCE = 0.1;
export interface RateProbeResult { rate: PlaybackRate; outcome: 'pass' | 'off' | 'stalled' | 'rejected'; slope?: number; waits?: number; ahead?: number; }
/** Media-time slope over a wall-clock window; a paused or starving element is not a rate result. */
export function judgeRate(rate: PlaybackRate, mediaSeconds: number, wallSeconds: number, starving: boolean): RateProbeResult {
  if (wallSeconds <= 0) return { rate, outcome: 'stalled' };
  // A window with waiting events measures supply, not the rate; the slope is still reported.
  const slope = Math.round(mediaSeconds / wallSeconds * 100) / 100;
  return { rate, outcome: starving ? 'stalled' : Math.abs(slope - rate) <= TOLERANCE ? 'pass' : 'off', slope };
}

/** R07 device probe (ADR-086 step 3, ADR-095). On explicit request it plays the most recently
 * resumed video through the production VOD source with the HTML video candidate and measures
 * fractional rates. Production playback, AVPlay and the rate menu are unchanged. It runs from
 * settings, where no player modal (and so no AVPlay decoder) is open. */
export function rateProbe(owner: ResourceOwner, shell: TvShell, caps: VodCapabilities, open: () => Promise<VodAccess>, profile: ProfileStore): HTMLElement {
  const panel = document.createElement('section'), heading = document.createElement('h2'), status = document.createElement('p'), output = document.createElement('pre'), screen = document.createElement('div');
  panel.className = 'rate-probe'; heading.textContent = '倍速探查（诊断）'; status.setAttribute('role', 'status'); screen.className = 'rate-probe-screen';
  output.tabIndex = 0; output.dataset.focusId = 'rate-probe-output';
  status.textContent = '用最近播放过的视频依次测试1/0.25/0.5/0.75/1.25/1.5/2倍速，约1分钟；不改变正常播放。';
  let running = false, stop = false, current: Promise<void> | undefined;
  const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  const start = productButton('rate-probe-start', '开始探查', () => { if (!running) current = run(); });
  const back = productButton('rate-probe-back', '返回设置', () => { void shell.back(); });
  async function run(): Promise<void> {
    const saved = profile.read(), latest = saved.kind === 'ok' ? [...saved.value.resume].sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined;
    if (!latest) { status.textContent = '请先正常播放任意视频一次，再运行探查'; return; }
    running = true; start.disabled = true; output.textContent = ''; status.textContent = '正在读取播放源';
    let video: HTMLVideoElement | undefined, backend: ElementVideoBackend | undefined, claimed = false, failed = '';
    const host = {
      claimDecoder: () => { if (claimed) return undefined; claimed = true; return () => { claimed = false; }; },
      createVideo: () => document.createElement('video'),
      attach: (element: HTMLVideoElement) => { video = element; element.muted = true; screen.replaceChildren(element); },
      screensaver: () => {},
    };
    let access: VodAccess | undefined, media: VodCatalogMedia | undefined;
    const results: RateProbeResult[] = [];
    try {
      access = await open();
      media = new VodCatalogMedia(access, { bvid: latest.bvid, part: 1 }, undefined, caps, () => undefined, () => {}, () => (backend = new ElementVideoBackend(host)), (outcome, closure) => { if (outcome !== 'ended') failed = closure.closed ? 'media.failed' : 'media.close_unknown'; });
      media.start(0, false);
      // Playback counts as running once media time has advanced by a second.
      const until = performance.now() + 30000;
      while (!stop && !failed && performance.now() < until && !(video && video.currentTime > 1 && !video.paused)) await wait(250);
      if (stop) return;
      if (!video || !backend || failed || video.currentTime <= 1) { status.textContent = `原生video未能播放生产MPD（${failed || 'probe.no_progress'}）`; return; }
      for (const rate of RATES) {
        if (stop) return;
        status.textContent = `正在测试 ${rate}×`;
        const accepted = backend.setRate(rate);
        if (accepted !== 'accepted') { results.push({ rate, outcome: 'rejected' }); continue; }
        await wait(2000); if (stop) return;
        let waits = 0; const onWait = () => { waits++; }; video.addEventListener('waiting', onWait);
        const t0 = video.currentTime, w0 = performance.now(); await wait(6000); video.removeEventListener('waiting', onWait); if (stop) return;
        const buffered = video.buffered, ahead = buffered.length ? Math.max(0, Math.round((buffered.end(buffered.length - 1) - video.currentTime) * 10) / 10) : 0;
        results.push({ ...judgeRate(rate, video.currentTime - t0, (performance.now() - w0) / 1000, waits > 0 || video.paused || video.readyState < 3), waits, ahead });
        output.textContent = results.map(r => `${r.rate}× ${r.outcome}${r.slope === undefined ? '' : ' 斜率 ' + r.slope}${r.waits === undefined ? '' : ' 等待 ' + r.waits + '次 缓冲 ' + r.ahead + '秒'}`).join('\n');
      }
      status.textContent = results.every(r => r.outcome === 'pass') ? '各档实测通过（仅探查，正常播放仍为1×/2×）' : '部分倍速未通过，见下方结果';
    } catch {
      if (!stop) status.textContent = '探查未完成：播放源读取或启动失败';
    } finally {
      const closure = media ? await media.close() : undefined; await access?.close().catch(() => {});
      screen.replaceChildren();
      if (closure && !closure.closed && !stop) status.textContent += '；解码器关闭未确认，请重新打开应用';
      running = false; if (!owner.signal.aborted) start.disabled = false;
    }
  }
  // Back during a run stops at the next step and waits for the media to close.
  owner.add('rate-probe', async () => { stop = true; await current; });
  panel.append(heading, status, start, back, screen, output);
  return panel;
}
