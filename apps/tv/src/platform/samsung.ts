import type { ProbeKeyManagerApi } from './keymanager-probe.ts';
import { AvplayBackend, type AvplayApi, type ScreenSaverApi, type PreparationInitialization } from './avplay.ts';
import { liveCdnUrl, liveRelayUrl } from '../../../../packages/contracts/src/live-probe.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { MediaCommand } from '../ui/input.ts';
interface ProductInfo { getModel(): string; getFirmware(): string; }
interface InputDeviceKey { name: string; code: number; }
interface SamsungGlobals {
  tizen?: { tvinputdevice?: { getSupportedKeys(): InputDeviceKey[]; registerKey(name: string): void }; keymanager?: ProbeKeyManagerApi; tvaudiocontrol?: { isMute(): boolean; getVolume(): number }; systeminfo?: { getCapability(name: string): string | boolean | number; getPropertyValue?(name: string, success: (value: { ipAddress?: unknown; status?: unknown }) => void, error: () => void): void }; application?: { getCurrentApplication(): { exit(): void; appInfo?: { id?: unknown } } } };
  webapis?: { productinfo?: ProductInfo; avplay?: unknown; appcommon?: unknown };
}
const platform = globalThis as unknown as SamsungGlobals;
/** Candidate envelope understood by our parser/MPD path, NOT a hardware
 * certification. AVPlay decides each actual source; domain owners fall back
 * after a confirmed decoder/transport failure. Model/firmware are diagnostics. */
export type VodRuntimeStatus = {kind:'available';capabilities:VodCapabilities}|{kind:'unavailable';reason:'player_api_missing'};
export function vodRuntimeStatus():VodRuntimeStatus {
  const api=platform.webapis?.avplay as Record<string,unknown>|undefined;
  const saver=platform.webapis?.appcommon as ScreenSaverApi|undefined;
  if(!api||['open','getState','setListener','setDisplayRect','prepareAsync','play','pause','seekTo','stop','close'].some(key=>typeof api[key]!=='function')||typeof saver?.setScreenSaver!=='function'||!saver.AppCommonScreenSaverState)return {kind:'unavailable',reason:'player_api_missing'};
  return {kind:'available',capabilities:{video:['avc','hevc','av1'],audio:['aac','eac3','flac'],qualities:Array.from({length:127},(_,i)=>i+1),maxWidth:16384,maxHeight:8640,maxFps:240,rates:[1,2]}};
}
export function vodCandidateCapabilities():VodCapabilities|undefined {
  const state=vodRuntimeStatus();return state.kind==='available'?state.capabilities:undefined;
}
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
const MEDIA_KEYS = new Map<string, MediaCommand>([['MediaPlayPause', 'play-pause'], ['MediaPlay', 'play'], ['MediaPause', 'pause'], ['MediaStop', 'stop'], ['MediaFastForward', 'forward'], ['MediaRewind', 'rewind']]);
// Samsung remote defaults; a TV's own getSupportedKeys() codes replace them once registered.
const mediaCodes = new Map<number, MediaCommand>([[10252, 'play-pause'], [415, 'play'], [19, 'pause'], [413, 'stop'], [417, 'forward'], [412, 'rewind']]);
/** Registers only media keys the TV reports (tv.inputdevice privilege). Mandatory
 * arrows/Enter/Back need no registration, so any failure leaves them untouched. */
export function registerMediaKeys(): 'registered' | 'none' | 'unavailable' {
  const input = platform.tizen?.tvinputdevice; if (!input) return 'unavailable';
  let registered = 0;
  try {
    for (const key of input.getSupportedKeys().slice(0, 256)) {
      const command = MEDIA_KEYS.get(key.name);
      if (!command || !Number.isSafeInteger(key.code)) continue;
      try { input.registerKey(key.name); mediaCodes.set(key.code, command); registered++; } catch { /* Unsupported key remains unregistered. */ }
    }
  } catch { return 'unavailable'; }
  return registered ? 'registered' : 'none';
}
export function mediaCommand(event: Pick<KeyboardEvent, 'key' | 'keyCode'>): MediaCommand | undefined {
  return mediaCodes.get(event.keyCode) ?? MEDIA_KEYS.get(event.key);
}
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
export function createCastProbePlayer(url: string, initialization?: PreparationInitialization): AvplayBackend | undefined {
  if (!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/cast\.mp4$/.test(url)) return undefined;
  return createLocalProbePlayer(url, true, initialization);
}
export function createProbePlayer(): AvplayBackend | undefined { return createLocalProbePlayer('http://127.0.0.1:40323/probe.mpd'); }
// Private fixed-room preflight result only; SDK owns subsequent HLS networking.
// This probe does not claim curl destination/redirect enforcement inside AVPlay.
export function createLiveProbePlayer(url: string): AvplayBackend | undefined {
  try { return createLocalProbePlayer(liveCdnUrl(url, 'm3u8')); } catch { return undefined; }
}
export function createLiveRelayProbePlayer(url: string): AvplayBackend | undefined {
  return createLiveRelayPlayer(url);
}
export function createLiveRelayPlayer(url:string):AvplayBackend|undefined {
  try { return createLocalProbePlayer(liveRelayUrl(url)); } catch { return undefined; }
}
function createLocalProbePlayer(manifestUrl: string, progressiveBuffering = false, initialization?: PreparationInitialization): AvplayBackend | undefined {
  const api = platform.webapis?.avplay as AvplayApi | undefined;
  const saver = platform.webapis?.appcommon as ScreenSaverApi | undefined;
  if (!api || !saver || ['open', 'getState', 'setListener', 'setDisplayRect', 'prepareAsync', 'play', 'pause', 'seekTo', 'stop', 'close'].some(key => typeof (api as unknown as Record<string, unknown>)[key] !== 'function') || typeof saver.setScreenSaver !== 'function' || !saver.AppCommonScreenSaverState) return undefined;
  return new AvplayBackend(api, saver, url => {
    if (url !== manifestUrl) throw new Error('fixed_probe_source_only');
    return url;
  }, progressiveBuffering, false, initialization);
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
export function keyManagerDataApi(): ProbeKeyManagerApi | undefined { return platform.tizen?.keymanager; }
export function probeKeyManagerApi(): ProbeKeyManagerApi | undefined { return keyManagerDataApi(); }

// Only our two fixed probe identities, never an application inventory.
export function probeApplicationIdentity(role: 'owner' | 'observer'): boolean {
  try { return platform.tizen?.application?.getCurrentApplication().appInfo?.id === (role === 'owner' ? 'BiliProbe1.Probe' : 'BiliIsola1.Probe'); } catch { return false; }
}
