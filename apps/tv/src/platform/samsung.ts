import type { ProbeKeyManagerApi } from './keymanager-probe.ts';
import { AvplayBackend, type AvplayApi, type ScreenSaverApi } from './avplay.ts';
interface ProductInfo { getModel(): string; getFirmware(): string; }
interface SamsungGlobals {
  tizen?: { keymanager?: ProbeKeyManagerApi; tvaudiocontrol?: { isMute(): boolean; getVolume(): number }; systeminfo?: { getCapability(name: string): string | boolean | number; getPropertyValue?(name: string, success: (value: { ipAddress?: unknown; status?: unknown }) => void, error: () => void): void }; application?: { getCurrentApplication(): { exit(): void; appInfo?: { id?: unknown } } } };
  webapis?: { productinfo?: ProductInfo; avplay?: unknown; appcommon?: unknown };
}
const platform = globalThis as unknown as SamsungGlobals;
export function inspectPlatform(): Record<string, string> {
  const read = (fn: () => unknown) => {
    try { const value = String(fn()); return /^[A-Za-z0-9_. -]{1,160}$/.test(value) ? value : 'redacted'; }
    catch { return 'unavailable'; }
  };
  let engineMajor: string | undefined;
  try {
    if (typeof navigator !== 'undefined') {
      engineMajor = /(?:Chrome|Chromium)\/([0-9]{1,5})\./.exec(navigator.userAgent)?.[1];
      const brands = (navigator as unknown as { userAgentData?: { brands?: { brand?: unknown; version?: unknown }[] } }).userAgentData?.brands;
      if (!engineMajor && Array.isArray(brands) && brands.length <= 8) {
        const item = brands.find(item => item && (item.brand === 'Chromium' || item.brand === 'Google Chrome'));
        if (item && typeof item.version === 'string' && /^[0-9]{1,5}$/.test(item.version)) engineMajor = item.version;
      }
    }
  } catch { /* Unavailable metadata remains unverified; never copy full UA. */ }
  return {
    environment: platform.tizen ? 'tizen-api-present-device-not-yet-accepted' : 'desktop-only',
    webEngine: `ua_chrome_major_${engineMajor ?? 'unavailable'}`,
    model: read(() => platform.webapis?.productinfo?.getModel() ?? 'unavailable'),
    firmware: read(() => platform.webapis?.productinfo?.getFirmware() ?? 'unavailable'),
    platform: read(() => platform.tizen?.systeminfo?.getCapability('http://tizen.org/feature/platform.version') ?? 'unavailable'),
    avplay: platform.webapis?.avplay ? 'symbol-present-not-playback-proof' : 'unavailable',
    mse: typeof MediaSource !== 'undefined' ? 'symbol-present-not-playback-proof' : 'unavailable',
    wasm: typeof WebAssembly !== 'undefined' ? 'symbol-present-run-worker-probe' : 'unavailable',
  };
}
export function isBack(event: KeyboardEvent): boolean { return event.keyCode === 10009 || event.key === 'Escape'; }
export function exitApplication(): boolean {
  if (!platform.tizen?.application) return false;
  try { platform.tizen.application.getCurrentApplication().exit(); return true; } catch { return false; }
}

// Address is transient display-only state. Never add it to inspectPlatform/export/logs.
export async function diagnosticAddress(): Promise<string | undefined> {
  const system = platform.tizen?.systeminfo;
  if (!system?.getPropertyValue) return undefined;
  const read = (property: string) => new Promise<string | undefined>(resolve => {
    let done = false;
    const finish = (value?: string) => { if (!done) { done = true; clearTimeout(timer); resolve(value); } };
    const timer = setTimeout(() => finish(), 1500);
    try { system.getPropertyValue!(property, value => {
      const address = value.ipAddress;
      if (value.status !== (property === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED') || typeof address !== 'string' || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(address)) { finish(); return; }
      const parts = address.split('.').map(Number);
      finish(parts.every(part => part <= 255) && parts[0] !== 0 && parts[0] !== 127 && parts[0]! < 224 ? address : undefined);
    }, () => finish()); } catch { finish(); }
  });
  const [wired, wifi] = await Promise.all([read('ETHERNET_NETWORK'), read('WIFI_NETWORK')]);
  return wired ?? wifi;
}

export function createGuestProbePlayer(manifestUrl: string): AvplayBackend | undefined {
  if (!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest\.mpd$/.test(manifestUrl)) return undefined;
  return createLocalProbePlayer(manifestUrl);
}
export function createCastProbePlayer(url: string): AvplayBackend | undefined {
  if (!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/cast\.mp4$/.test(url)) return undefined;
  return createLocalProbePlayer(url, true);
}
export function createProbePlayer(): AvplayBackend | undefined { return createLocalProbePlayer('http://127.0.0.1:40323/probe.mpd'); }
function createLocalProbePlayer(manifestUrl: string, progressiveBuffering = false): AvplayBackend | undefined {
  const api = platform.webapis?.avplay as AvplayApi | undefined;
  const saver = platform.webapis?.appcommon as ScreenSaverApi | undefined;
  if (!api || !saver || ['open', 'getState', 'setListener', 'setDisplayRect', 'prepareAsync', 'play', 'pause', 'seekTo', 'stop', 'close'].some(key => typeof (api as unknown as Record<string, unknown>)[key] !== 'function') || typeof saver.setScreenSaver !== 'function' || !saver.AppCommonScreenSaverState) return undefined;
  return new AvplayBackend(api, saver, url => {
    if (url !== manifestUrl) throw new Error('fixed_probe_source_only');
    return url;
  }, progressiveBuffering);
}

export function probeAudioState(): string {
  try {
    const audio = platform.tizen?.tvaudiocontrol;
    if (!audio) return 'avplay.tv_audio_state_unavailable';
    const mute = audio.isMute(), volume = audio.getVolume();
    if (typeof mute !== 'boolean' || !Number.isInteger(volume) || volume < 0 || volume > 100) return 'avplay.tv_audio_state_unavailable';
    return `avplay.tv_mute_${mute}_volume_${volume}`;
  } catch { return 'avplay.tv_audio_state_unavailable'; }
}

// Dedicated synthetic probe only; no alias enumeration or permission grants.
export function probeKeyManagerApi(): ProbeKeyManagerApi | undefined { return platform.tizen?.keymanager; }

// Only our two fixed probe identities, never an application inventory.
export function probeApplicationIdentity(role: 'owner' | 'observer'): boolean {
  try { return platform.tizen?.application?.getCurrentApplication().appInfo?.id === (role === 'owner' ? 'BiliProbe1.Probe' : 'BiliIsola1.Probe'); } catch { return false; }
}
