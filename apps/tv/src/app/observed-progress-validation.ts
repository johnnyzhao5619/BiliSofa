import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { ACCOUNT_TEST_VIDEO as video } from '../../../../packages/contracts/src/account-probe.ts';
import { type ObservedReceipt } from '../../../../packages/contracts/src/observed-progress.ts';
import { WatchObservation } from '../../../../packages/media/src/watch-observation.ts';
import { RateProbePlayback } from '../platform/rate-probe.ts';
import { AccountProbeWorker } from '../platform/account-probe-worker.ts';
import { ObservedProgress } from '../platform/observed-progress.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { diagnosticAddress, inspectPlatform, isBack } from '../platform/samsung.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
import { drawQr, clearQr } from '../ui/qr-code.ts';
const root = document.querySelector<HTMLElement>('main')!, screen = document.querySelector<HTMLElement>('#media-dialog')!, status = document.querySelector<HTMLElement>('#status')!, feedback = document.querySelector<HTMLElement>('#media-status')!, identity = document.querySelector<HTMLElement>('#identity')!, position = document.querySelector<HTMLElement>('#position')!, canvas = document.querySelector<HTMLCanvasElement>('#qr')!, confirm = document.querySelector<HTMLButtonElement>('#confirm-progress')!, ack = document.querySelector<HTMLButtonElement>('#ack-prior')!;
const focus = new FocusRouter(document, root), sessions = new SessionManager(), playback = new RateProbePlayback(), account = new AccountProbeWorker(), progress = new ObservedProgress(), reporter = new ProbeWorker();
const entries: {
    caseId: string;
    code: string;
    verdict: string;
    kind: 'capability';
}[] = [];
let epoch = 0, busy = false, disposed = false, poisoned = false, receipt: ObservedReceipt | undefined, watch: WatchObservation | undefined, timer: ReturnType<typeof setTimeout> | undefined;
function add(code: string, verdict = 'UNVERIFIED'): void { if (!/^[a-z0-9_.-]{1,96}$/.test(code))
    code = 'observed.unclassified'; entries.push({ caseId: 'W01-observed-progress', code, verdict, kind: 'capability' }); while (entries.length > 8) {
    const i = entries.findIndex(e => e.code === 'observed.ready' || e.code === 'observed.preparing');
    entries.splice(i < 0 ? 0 : i, 1);
} status.textContent = verdict + ' · ' + code; }
function refresh(): void { ack.disabled = !receipt || busy || poisoned || progress.attempted(); ack.textContent = ack.getAttribute('aria-checked') === 'true' ? '已确认：知晓旧未知，授权本次一次写回' : '知晓旧结果未知，授权本次一次写回'; confirm.disabled = !receipt || ack.getAttribute('aria-checked') !== 'true' || progress.attempted() || busy || poisoned; }
async function close(): Promise<boolean> { epoch++; sessions.invalidate(); watch = undefined; clearTimeout(timer); clearQr(canvas); canvas.hidden = true; identity.textContent = ""; position.textContent = ""; receipt = undefined; ack.setAttribute('aria-checked', 'false'); refresh(); const result = await Promise.allSettled([playback.stop(), account.dispose(), progress.dispose(), reporter.dispose()]); if (result.some(r => r.status === 'rejected')) {
    poisoned = true;
    add('observed.cleanup_unconfirmed_restart_required', 'FAIL');
} const open = !screen.hidden; screen.hidden = true; root.inert = false; document.body.classList.remove('media-active'); if (open)
    focus.leaveModal(root); return !poisoned; }
async function report(owner = epoch): Promise<void> { if (owner !== epoch || disposed || document.hidden)
    return; const task = sessions.begin('observed-report'); try {
    if (!await diagnosticAddress() || owner !== epoch || document.hidden)
        return;
    await reporter.run({ version: 1, operation: 'http', scope: task.scope, report: parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries })) });
}
catch {
    if (owner === epoch)
        status.textContent = '记录尚未读取，可点读取状态';
}
finally {
    task.finish();
} }
async function login(): Promise<void> { if (busy)
    return; busy = true; if (!await close() || disposed || document.hidden) {
    busy = false;
    return;
} sessions.switchAccount('w01-authorized-account'); const owner = epoch, task = sessions.begin('observed-login'); try {
    const code = await account.run(account.hasSaved() ? 'restore' : 'login', task.scope, task.signal, event => { if (owner !== epoch)
        return; if (event.kind === 'qr') {
        canvas.hidden = false;
        drawQr(canvas, event.url);
    }
    else if (event.kind === 'summary') {
        clearQr(canvas);
        canvas.hidden = true;
        identity.textContent = `本人账号：${event.view.name}（ID末${event.view.uidSuffix}）`;
        position.textContent = `${video.bvid} 首P95秒 · 当前云进度 ${event.view.lastPlayTime} 毫秒`;
    }
    else
        status.textContent = '请在官方App确认登录'; });
    if (owner === epoch)
        add(code, ['account.readonly_saved_closed', 'account.restore_readonly_closed'].includes(code) ? 'PASS' : 'UNVERIFIED');
}
catch {
    if (owner === epoch)
        add('observed.login_unconfirmed');
}
finally {
    busy = false;
    task.finish();
    refresh();
} if (owner === epoch)
    await report(); }
async function observed(value: ObservedReceipt, owner: number): Promise<void> { watch = undefined; clearTimeout(timer); if (owner !== epoch)
    return; try {
    await playback.stop();
    if (owner !== epoch)
        return;
    const open = !screen.hidden;
    screen.hidden = true;
    root.inert = false;
    document.body.classList.remove('media-active');
    if (open)
        focus.leaveModal(root);
    receipt = value;
    position.textContent = `${video.bvid} 首P：实际观看 ${value.realSec} 秒，拟写回 ${value.positionSec} 秒。旧15秒结果未知记录保留；未写入。`;
    add('observed.watch_ready_p' + value.positionSec + '_r' + value.realSec + '_w' + value.wallSec, 'PASS');
}
catch {
    poisoned = true;
    add('observed.media_cleanup_unconfirmed', 'FAIL');
}
finally {
    busy = false;
    refresh();
} await report(); }
async function run(): Promise<void> { if (busy)
    return; busy = true; if (!await close() || disposed || document.hidden) {
    busy = false;
    return;
} try {
    if (!account.hasSaved())
        throw new Error();
}
catch {
    busy = false;
    add('observed.login_required');
    return;
} sessions.switchAccount('guest'); const owner = epoch, task = sessions.begin('observed-watch'); screen.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(screen); feedback.textContent = '准备公开视频；从头正常观看约20秒'; add('observed.preparing'); timer = setTimeout(() => { if (owner === epoch)
    void close().then(() => { busy = false; add('observed.watch_timeout_no_write', 'FAIL'); void report(); }); }, 60000); try {
    await playback.start(task.scope, task.signal, ms => { if (owner !== epoch || !watch)
        return; feedback.textContent = `实际进度 ${Math.floor(ms / 1000)} 秒 · 正常播放观察`; const value = watch.add(performance.now(), ms); if (value)
        void observed(value, owner); }, code => { if (owner === epoch)
        void close().then(() => { busy = false; add(code, 'FAIL'); void report(); }); });
    if (owner === epoch) {
        watch = new WatchObservation(performance.now(), Date.now());
        clearTimeout(timer);
        timer = setTimeout(() => { if (owner === epoch && watch)
            void close().then(() => { busy = false; add('observed.watch_not_eligible_no_write'); void report(); }); }, 31000);
    }
}
catch {
    if (owner === epoch) {
        await close();
        busy = false;
        add(playback.failure(), 'FAIL');
        await report();
    }
}
finally {
    task.finish();
} }
async function submit(): Promise<void> {
    if (busy || !receipt || confirm.disabled || document.hidden || disposed)
        return;
    const value = receipt, owner = epoch;
    receipt = undefined;
    busy = true;
    refresh();
    try {
        await reporter.dispose();
        if (owner !== epoch || disposed || document.hidden)
            return;
        sessions.switchAccount('w01-authorized-account');
        const task = sessions.begin('observed-submit');
        try {
            const result = await progress.submit(task.scope, task.signal, value, true, ack.getAttribute('aria-checked') === 'true');
            if (owner !== epoch)
                return;
            if (result.postCode)
                add(result.postCode);
            position.textContent = result.positionMs === undefined ? '本次结果未确认；不重发' : `云端回读 ${result.positionMs} 毫秒`;
            add(result.code, result.code === 'observed.write_readback_confirmed' ? 'PASS' : 'UNVERIFIED');
        }
        finally {
            task.finish();
        }
    }
    catch {
        if (owner === epoch)
            add('observed.operation_unconfirmed_no_retry');
    }
    finally {
        busy = false;
        refresh();
    }
    if (owner === epoch)
        await report();
}
const input = new InputRouter(document, focus, () => { void close().then(() => { busy = false; refresh(); void report(); }); }, isBack);
document.querySelector('#login')!.addEventListener('click', () => { void login(); });
document.querySelector('#run')!.addEventListener('click', () => { void run(); });
confirm.addEventListener('click', () => { void submit(); });
ack.addEventListener('click', () => { ack.setAttribute('aria-checked', ack.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); refresh(); });
for (const id of ['stop', 'media-stop'])
    document.querySelector('#' + id)!.addEventListener('click', () => { void close().then(() => { busy = false; refresh(); void report(); }); });
document.querySelector('#report')!.addEventListener('click', () => { void reporter.dispose().then(() => report()); });
document.querySelector('#clear')!.addEventListener('click', () => { void close().then(() => { busy = false; if (!poisoned) {
    try {
        account.clearSaved();
        identity.textContent = '';
        position.textContent = '';
        add('account.local_session_deleted', 'PASS');
    }
    catch {
        add('account.local_session_delete_unconfirmed', 'FAIL');
    }
} void report(); }); });
const hidden = () => { if (document.hidden)
    void close().then(() => { busy = false; refresh(); }); };
document.addEventListener('visibilitychange', hidden);
globalThis.addEventListener('pagehide', () => { disposed = true; void close(); input.dispose(); sessions.dispose(); document.removeEventListener('visibilitychange', hidden); }, { once: true });
focus.initial('login');
add('observed.ready');
void report();
