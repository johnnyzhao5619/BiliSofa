import { decodeOfferObservation, offerTraceCode, type OfferObservation } from '../../../../packages/contracts/src/cast-offer-diagnostics.ts';
import { RECEIVER_FACTS, type ReceiverSnapshot, type ReceiverCommand } from '../../../../packages/contracts/src/cast-receiver.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { soapProbeSummary, mediaRequestSummary } from '../../../../packages/contracts/src/upnp.ts';
import { isPrivateProbeAddress, type CastProbeResult } from '../../../../packages/contracts/src/cast-probe.ts';
import { CastProbeWorker, castProbeIdentity } from '../platform/cast-probe-worker.ts';
import { diagnosticAddress } from '../platform/samsung.ts';
import type { FocusRouter } from './focus.ts';
export class CastProbeView {
  private readonly session = new SessionManager();
  private readonly worker = new CastProbeWorker();
  private ready = false;
  private initMib: number | undefined;
  private sourceLayoutCode: string | undefined;
  private sourcePassed = false;
  private readMib = 0;
  private readAt = 0;
  get preparationReadMib(): number { return this.readMib; }
  get preparationProgressAt(): number { return this.readAt; }
  private generation = 1;
  private sessionMode = false;
  private replacing = false;
  private playing = false;
  private requested = false;
  private candidateState: 'waiting' | 'ready' | 'expired' | 'unavailable' = 'waiting';
  private requestTimer: ReturnType<typeof setTimeout> | undefined;
  private candidateUrl: string | undefined;
  private readonly play: HTMLButtonElement;
  private closing: Promise<void> = Promise.resolve();
  private cleanupConfirmed = true;
  get closedCleanly(): boolean { return this.cleanupConfirmed; }
  private readonly state: HTMLElement;
  private readonly history: HTMLElement;
  private readonly facts = new Set<string>();
  private requests = new Set<string>();
  private network = new Set<string>();
  private controlCheck = false;
  private receiverMode = false;
  private transitionBits = 0;
  private offerTrace: OfferObservation[] = [];
  private offerCapped = false;
  private lastSnapshot: ReceiverSnapshot | undefined;
  private timeoutProof: { generation: number; timer: ReturnType<typeof setTimeout> | undefined; first: { at: number; timeMs: number } | undefined; lastMs: number; confirmed: boolean } | undefined;
  private readonly receiverFacts = new Set<string>();
  noteReceiver(fact: typeof RECEIVER_FACTS[number]): void {
    if (!this.receiverMode || !this.playing) return;
    const code = 'cast.receiver_' + fact; if (this.receiverFacts.has(code)) return;
    this.receiverFacts.add(code); this.observed({ closed: false, code });
  }
  snapshot(value: ReceiverSnapshot, generation = 1): boolean {
    const sent = this.receiverMode && this.playing && generation === this.generation && this.worker.snapshot(this.sessionMode ? { ...value, generation } : value);
    if (sent) {
      this.lastSnapshot = value; this.noteReceiver('snapshot_sent');
      const proof = this.timeoutProof;
      if (proof && proof.generation === generation) {
        if (value.state === 'idle' || value.state === 'error') this.clearTimeoutProof();
        else if (value.state !== 'playing' || value.seeking) { clearTimeout(proof.timer); proof.timer = undefined; proof.first = undefined; proof.lastMs = value.timeMs; }
        else {
          if (!proof.timer || value.timeMs !== proof.lastMs) this.armTimeoutProof(proof);
          if (!proof.first) proof.first = { at: performance.now(), timeMs: value.timeMs };
          else if (!proof.confirmed && performance.now() - proof.first.at >= 1000 && value.timeMs - proof.first.timeMs >= 1000) {
            proof.confirmed = true; this.noteTimeout('progress', generation);
          }
          proof.lastMs = value.timeMs;
        }
      }
    } return sent;
  }
  acknowledge(id: number, accepted: boolean): void { this.worker.acknowledge(id, accepted); }
  seekResult(ok: boolean): void { this.worker.seekResult(ok); }
  constructor(private readonly modal: HTMLElement, private readonly root: HTMLElement, private readonly focus: FocusRouter, private readonly onStart: () => void, private readonly observed: (result: Pick<CastProbeResult, 'closed' | 'code'>) => void, private readonly playCandidate: (url: string, controlCheck: boolean, receiverMode: boolean, initMib: number | undefined, generation: number, replacing: boolean) => void, private readonly stopCandidate: () => void, private readonly command: (id: number, value: ReceiverCommand) => void, private readonly closeDecoder: () => boolean = () => false) {
    this.play = modal.querySelector<HTMLButtonElement>('#cast-play')!;
    this.play.addEventListener('click', () => this.requestCandidate());
    this.state = modal.querySelector('#cast-state')!;
    this.history = modal.querySelector('#cast-history')!;
    modal.querySelector('#cast-close')!.addEventListener('click', () => this.close());
  }
  private requestCandidate(): void {
    if (this.play.disabled || this.playing || this.requested) return;
    this.play.disabled = true;
    if (!this.worker.approveCandidate(this.receiverMode)) { this.state.textContent = '候选已失效，请停止后重新投送'; return; }
    this.requested = true; this.observed({ closed: false, code: 'cast.candidate_confirm_sent' });
    this.state.textContent = '电视已确认，正在开启媒体桥';
    this.requestTimer = setTimeout(() => {
      if (!this.requested || this.playing || this.modal.hidden && !this.replacing) return;
      this.observed({ closed: true, code: 'cast.candidate_confirm_timeout' }); void this.close();
    }, 10000);
  }
  async show(startupOnly = false, controlCheck = false, receiverMode = false, approveNext = false, sessionMode = false): Promise<boolean> {
    if (!this.modal.hidden || this.playing || approveNext && (!receiverMode || startupOnly || controlCheck) || sessionMode && !approveNext) return false;
    const requests = new Set<string>(); this.requests = requests; const network = new Set<string>(); this.network = network;
    this.sessionMode = sessionMode; this.generation = 1; this.replacing = false;
    this.receiverMode = receiverMode; this.receiverFacts.clear(); this.transitionBits = 0; this.offerTrace = []; this.offerCapped = false; this.lastSnapshot = undefined;
    this.controlCheck = controlCheck; this.modal.querySelector('#cast-note')!.textContent = controlCheck ? '请选择两分钟以上普通视频。确认后自动检查三次回跳和35秒进度，可按Back停止。' : '源检查通过后，可在电视确认播放候选（最长5分钟）；手机控制尚未接通。'; this.play.textContent = controlCheck ? '播放并自动检查三次回跳' : '播放已检查候选';
    if (receiverMode) { this.modal.querySelector('#cast-note')!.textContent = '电视确认后仅允许本次发送端控制。起播后在手机重连同一视频；最长5分钟。'; this.play.textContent = '播放并允许本次手机控制'; }
    if (approveNext) this.modal.querySelector('#cast-note')!.textContent = '已允许一次官方投送。首个合规源检查通过后自动起播；手机无需重连。Back取消；更换视频请返回后重新允许。最长5分钟（含准备与暂停）。';
    if (sessionMode) this.modal.querySelector('#cast-note')!.textContent = '已允许同一发送端本次会话换集/切P，最多4个源、原期限5分钟及累计预算不重置。Back结束；遥控接管后需交还。';
    this.initMib = this.sourceLayoutCode = undefined; this.sourcePassed = false; this.readMib = this.readAt = 0; this.onStart(); this.cleanupConfirmed = false; this.ready = false; this.playing = this.requested = false; this.play.disabled = true; this.candidateUrl = undefined; this.candidateState = 'waiting'; this.clearRequestTimer(); this.facts.clear(); this.history.replaceChildren(); const task = this.session.begin('cast-discovery');
    let checked = false;
    const timer = startupOnly ? setTimeout(() => {
      if (!this.session.accepts(task.scope)) return;
      checked = true; this.observed({ closed: true, code: 'cast.startup_timeout' }); void this.close();
    }, 15000) : undefined;
    this.modal.hidden = false; this.root.inert = true; this.focus.enterModal(this.modal); this.state.textContent = '正在读取电视网络连接';
    try {
      const address = await diagnosticAddress();
      if (!this.session.accepts(task.scope)) return false;
      if (!isPrivateProbeAddress(address)) { this.state.textContent = '需要电视已连接普通局域网'; this.observed({ closed: true, code: 'cast.address_unavailable' }); return true; }
      let storage: Storage | undefined; try { storage = localStorage; } catch { /* Ephemeral own identity. */ }
      const identity = castProbeIdentity(storage);
      this.candidateUrl = `http://127.0.0.1:40324/${identity.token}/cast.mp4`;
      const result = await this.worker.run({ version: 1, operation: 'cast-discovery', scope: task.scope, address, ...identity, ...(approveNext ? { receiverApproval: sessionMode ? 'session' as const : 'next-source' as const } : {}) }, task.signal, event => {
        if (event.code.startsWith('cast.media_request_')) requests.add(event.code);
        // Closure progress still belongs to this run's evidence, even after UI cancellation.
        if (/^cast\.(?:cleanup_cause_|listener_limit_|position_wire_v1_|media_(flow_|limit_|issue_|retry_|resume_|timeout_))/.test(event.code)) network.add(event.code);
        if (!this.session.accepts(task.scope)) return;
        const offer = decodeOfferObservation(event.code);
        if (offer) { this.offerTrace.push(offer.observation); if (this.offerTrace.length > 4) this.offerTrace.shift(); return; }
        if (event.code === 'cast.offer_limit_reached') { this.offerCapped = true; return; }
        const isolated = /^cast\.media_timeout_isolated_g([1-4])$/.exec(event.code);
        if (isolated) this.checkTimeoutProgress(Number(isolated[1]));
        if (event.transition) {
          const next = event.transition;
          if (!this.sessionMode || !this.playing || next.generation !== this.generation + 1) { this.worker.decoderClosed(next.generation, false); return; }
          this.clearTimeoutProof();
          this.generation = next.generation; this.lastSnapshot = undefined; this.replacing = true; this.playing = this.requested = false;
          this.initMib = this.sourceLayoutCode = undefined; this.sourcePassed = false; this.readMib = this.readAt = 0;
          this.candidateState = 'waiting'; this.play.disabled = true; this.clearRequestTimer();
          this.candidateUrl = `http://127.0.0.1:40324/${next.token}/cast.mp4`;
          const closed = this.closeDecoder();
          this.worker.decoderClosed(next.generation, closed);
          this.observed({ closed: false, code: event.code }); return;
        }
        if (this.replacing && /^cast\.source_(failed_|invalid_)/.test(event.code)) { this.observed(event); this.stopCandidate(); return; }
        if (event.command) { if (this.receiverMode && this.playing) this.command(event.command.id, event.command.value); else this.worker.acknowledge(event.command.id, false); return; }
        if (event.code.startsWith('cast.source_layout_')) this.sourceLayoutCode = event.code;
        if (event.code === 'cast.source_pass') this.sourcePassed = true;
        const init = /^cast\.source_init_mib_([1-9][0-9]{0,2})$/.exec(event.code); if (init) this.initMib = Number(init[1]);
        const read = /^cast\.media_read_mib_([1-9][0-9]{0,2})$/.exec(event.code); if (read && Number(read[1]) > this.readMib) { this.readMib = Number(read[1]); this.readAt = performance.now(); }
        const stage = /^cast\.transition_(accepted|decoder_closed|native_closed|ready)_([2-4])$/.exec(event.code);
        if (stage) this.transitionBits |= 1 << ((Number(stage[2]) - 2) * 4 + ['accepted','decoder_closed','native_closed','ready'].indexOf(stage[1]!));
        if (event.code.startsWith('cast.receiver_')) this.receiverFacts.add(event.code);
        if (event.code === 'cast.source_pass' && !startupOnly) { this.candidateState = 'ready'; this.play.disabled = false; if (approveNext) this.requestCandidate(); }
        if (event.code.startsWith('cast.media_issue_') || ['cast.media_expired', 'cast.media_unavailable', 'cast.media_failed'].includes(event.code)) { this.candidateState = event.code === 'cast.media_expired' ? 'expired' : 'unavailable'; this.play.disabled = true; this.clearRequestTimer(); }
        if (event.code === 'cast.media_ready' && this.requested && !this.playing && this.candidateUrl && !startupOnly) {
          this.clearRequestTimer(); const replacing = this.replacing; this.replacing = false; this.playing = true;
          if (!this.modal.hidden) { this.modal.hidden = true; this.root.inert = false; this.focus.leaveModal(this.root); }
          this.playCandidate(this.candidateUrl, this.controlCheck, this.receiverMode, this.initMib, this.generation, replacing);
        }
        if ((this.playing || this.replacing) && (event.code.startsWith('cast.media_issue_') || ['cast.media_stopped', 'cast.media_failed'].includes(event.code))) this.stopCandidate();
        if (event.code === 'cast.ready') { this.ready = true; this.state.textContent = '五分钟内，在官方App的TV投屏列表查找 BiliSofa W01 Discovery'; }
        else this.state.textContent = ({ 'cast.soap_transport_query': '已回答状态查询：当前没有媒体', 'cast.soap_position_query': '已回答进度查询：当前没有媒体', 'cast.soap_media_query': '已回答媒体查询：当前没有媒体', 'cast.soap_capabilities_query': '已回答能力查询', 'cast.soap_settings_query': '已回答播放设置查询', 'cast.soap_actions_query': '已回答可用动作查询：当前没有媒体', 'cast.soap_protocol_query': '已回答媒体格式查询', 'cast.soap_connections_query': '已回答连接列表查询：尚无接收会话', 'cast.soap_volume_query_rejected': '音量查询尚未接通，已拒绝', 'cast.soap_mute_query_rejected': '静音查询尚未接通，已拒绝', 'cast.soap_control_rejected': '收到播放控制：媒体尚未接通，已拒绝', 'cast.soap_mp4_offer_rejected': '收到合规MP4候选：媒体尚未接通，已拒绝', 'cast.soap_uri_offer_rejected': '收到媒体地址：手机接收会话尚未接通', 'cast.soap_invalid': '收到格式不支持的SOAP请求，已拒绝', 'cast.soap_unsupported': '收到尚未支持的SOAP动作或参数，已拒绝', 'cast.seen_search': '收到发现请求', 'cast.seen_reply': '已发送发现响应', 'cast.seen_description_request': '设备描述已被请求', 'cast.seen_service_request': '服务描述已被请求', 'cast.seen_control_rejected': '收到控制请求：本探针尚未接通媒体，已拒绝', 'cast.seen_protocol_query': '收到媒体格式查询，已返回MP4能力；尚未接通投屏播放', 'cast.seen_setup_rejected': '收到NVA连接请求：会话尚未接通，已拒绝' } as Record<string, string>)[event.code] ?? event.code;
        if (event.code.startsWith('cast.soap_') || event.code.startsWith('cast.source_') || event.code.startsWith('cast.media_')) {
          if (event.code.startsWith('cast.soap_')) this.facts.add(event.code);
          const line = document.createElement('li'); line.textContent = `${this.soapLabel(event.code)} · ${event.code}`; this.history.append(line);
          while (this.history.childElementCount > 4) this.history.firstElementChild!.remove();
          this.state.textContent = event.code === 'cast.source_started' ? '正在检查HTTPS候选（最多8秒），可停止返回' : event.code === 'cast.source_pass' ? '检查通过，可选择“播放已检查候选”（60秒内）' : '已记录请求；最近四项保留在下方';
        }
        // Later sender polling must not hide the TV action that is still required.
        if (!this.playing && this.candidateState !== 'waiting') this.state.textContent = this.candidateState === 'expired' ? '确认窗口已过期。停止返回后重新投送。' : this.candidateState === 'unavailable' ? '候选未能启动。停止返回后可读取诊断。' : this.requested ? '电视已确认，正在开启媒体桥' : `源已就绪。按左选择“${this.play.textContent}”，再按确认（60秒内）。`;
        this.observed(event);
        if (startupOnly && event.code === 'cast.ready') { checked = true; void this.close(); }
      });
      if (this.session.accepts(task.scope)) { checked = true; if (this.playing || this.replacing) this.stopCandidate(); this.play.disabled = true; this.summarize(); this.observed(result); this.ready = false; this.state.textContent = result.code.startsWith('cast.closed_') ? '发现窗口已结束，监听已关闭' : result.code; }
    } catch (error) {
      if (this.session.accepts(task.scope)) { checked = true; if (this.playing || this.replacing) this.stopCandidate(); this.play.disabled = true; this.summarize(); this.state.textContent = '发现探针失败，可停止返回'; this.observed({ closed: true, code: error instanceof DomainError ? `cast.worker_${error.code}` : 'cast.worker_failed' }); }
    } finally { if (timer) clearTimeout(timer); this.clearRequestTimer(); task.finish(); }
    return checked;
  }
  private clearRequestTimer(): void { clearTimeout(this.requestTimer); this.requestTimer = undefined; }
  private clearTimeoutProof(): void { if (this.timeoutProof) clearTimeout(this.timeoutProof.timer); this.timeoutProof = undefined; }
  private noteTimeout(outcome: 'progress' | 'unconfirmed', generation: number): void {
    const code = `cast.media_timeout_${outcome}_g${generation}`; this.network.add(code); this.observed({ closed: false, code });
  }
  private failTimeoutProgress(generation: number): void {
    this.clearTimeoutProof(); this.noteTimeout('unconfirmed', generation);
    this.observed({ closed: false, code: 'cast.media_issue_206_28' }); this.candidateState = 'unavailable'; this.play.disabled = true; this.stopCandidate();
  }
  private checkTimeoutProgress(generation: number): void {
    this.clearTimeoutProof();
    if (!this.playing || this.replacing || generation !== this.generation || this.lastSnapshot?.state !== 'playing' || this.lastSnapshot.seeking) { this.failTimeoutProgress(generation); return; }
    const proof: NonNullable<typeof this.timeoutProof> = { generation, timer: undefined, first: undefined, lastMs: this.lastSnapshot.timeMs, confirmed: false };
    this.timeoutProof = proof; this.armTimeoutProof(proof);
  }
  private armTimeoutProof(proof: NonNullable<typeof this.timeoutProof>): void {
    clearTimeout(proof.timer);
    proof.timer = setTimeout(() => {
      proof.timer = undefined;
      if (this.timeoutProof === proof && this.playing && this.generation === proof.generation && this.lastSnapshot?.state === 'playing' && !this.lastSnapshot.seeking) this.failTimeoutProgress(proof.generation);
    }, 5000);
  }
  private summarize(): void {
    const trace = offerTraceCode(this.offerTrace, this.offerCapped); if (trace) this.observed({ closed: false, code: trace });
    if (this.transitionBits) this.observed({ closed: false, code: 'cast.transition_summary_v1_' + this.transitionBits.toString(16).padStart(3, '0') });
    if (this.sourceLayoutCode) this.observed({ closed: false, code: this.sourceLayoutCode });
    if (this.initMib !== undefined) this.observed({ closed: false, code: 'cast.source_init_mib_' + this.initMib });
    if (this.sourcePassed) this.observed({ closed: false, code: 'cast.source_pass' });
    if (this.readMib) this.observed({ closed: false, code: 'cast.media_read_mib_' + this.readMib });
    let bits = 0; for (const code of this.receiverFacts) { const i = RECEIVER_FACTS.findIndex(f => code === 'cast.receiver_' + f); if (i >= 0) bits |= 1 << i; }
    if (bits) this.observed({ closed: false, code: 'cast.receiver_summary_v2_' + (bits >>> 0).toString(16).padStart(8, '0') });
    const code = soapProbeSummary(this.facts); this.facts.clear();
    if (code) this.observed({ closed: false, code });
    const requestCode = mediaRequestSummary(this.requests);
    if (requestCode) this.observed({ closed: false, code: requestCode });
  }
  private soapLabel(code: string): string {
    const media: Record<string, string> = { approved: 'Worker已接收本次电视确认', ready: '电视内媒体桥已启动', served: '媒体范围已送达播放器', stopped: '媒体桥已关闭', expired: '候选已过期，请重新开启投送', unavailable: '候选不可用，请重新开启投送', failed: '媒体桥失败，请停止后重试' };
    if (code.startsWith('cast.media_')) return media[code.slice(11)] ?? '媒体状态已记录';
    if (code.startsWith('cast.source_policy_')) return 'HTTPS候选策略检查已记录';
    if (code === 'cast.source_candidate_valid') return 'HTTPS候选通过本地目的地与期限校验';
    if (code === 'cast.source_upgrade_planned') return '仅检查同址HTTPS候选，不发送HTTP';
    if (code === 'cast.source_started') return '正在检查HTTPS范围（最多8秒）';
    if (code === 'cast.source_pass') return 'HTTPS证书、206范围与MP4文件头检查通过';
    if (code.startsWith('cast.source_failed_')) return 'HTTPS检查失败，不回退HTTP';
    if (code.startsWith('cast.source_invalid_')) return '候选或媒体头未通过检查';
    if (code.startsWith('cast.soap_offer_args_')) return '媒体请求参数结构已分类；尚未接收';
    if (code.startsWith('cast.soap_offer_uri_')) return '媒体地址策略已分类；尚未读取';
    if (code.startsWith('cast.soap_offer_metadata_')) return '媒体描述结构已分类；内容未执行';
    const stages: Record<string, string> = { header: '动作头', xml: 'XML格式或预算', envelope: 'SOAP外层', body: 'SOAP正文结构', action: '动作或服务', arguments: '参数', media_fields: '媒体字段长度' };
    const invalid = /^cast\.soap_(offer_)?invalid_(header|xml|envelope|body|action|arguments|media_fields)$/.exec(code);
    if (invalid) return `${invalid[1] ? '媒体请求' : '请求'}未通过${stages[invalid[2]!]!}校验`;
    return ({ 'cast.soap_play_rejected': '播放尚未接通，已拒绝', 'cast.soap_pause_rejected': '暂停尚未接通，已拒绝', 'cast.soap_stop_rejected': '停止尚未接通，已拒绝', 'cast.soap_seek_rejected': '跳转尚未接通，已拒绝', 'cast.soap_transport_query': '已回答状态查询：无媒体', 'cast.soap_position_query': '已回答进度查询：无媒体', 'cast.soap_media_query': '已回答媒体查询：无媒体', 'cast.soap_mp4_offer_rejected': '收到合规MP4候选，尚未接收', 'cast.soap_uri_offer_rejected': '手机接收会话尚未接通', 'cast.soap_unsupported': '动作或参数尚未支持' } as Record<string, string>)[code] ?? '已记录查询或拒绝结果';
  }
  back(): boolean { if (this.modal.hidden) return false; this.close(); return true; }
  close(): Promise<void> {
    if (this.modal.hidden && !this.playing && !this.replacing) return this.closing;
    this.clearRequestTimer();
    this.clearTimeoutProof();
    if (this.receiverMode) this.observed({ closed: false, code: `cast.exit_g${this.generation}_${this.lastSnapshot?.state ?? 'missing'}_s${this.lastSnapshot?.seeking ? 1 : 0}` });
    const wasVisible = !this.modal.hidden; this.playing = this.replacing = false; this.play.disabled = true; this.candidateUrl = undefined;
    const requestFacts = this.requests, networkFacts = this.network; this.summarize();
    const ready = this.ready; this.ready = false; this.session.invalidate();
    const flush = () => {
      const code = mediaRequestSummary(requestFacts); requestFacts.clear(); if (code) this.observed({ closed: false, code });
      for (const code of networkFacts) this.observed({ closed: false, code });
      networkFacts.clear();
    };
    this.closing = this.worker.dispose().then(() => { this.cleanupConfirmed = true; flush(); if (ready) this.observed({ closed: true, code: 'cast.native_closed_confirmed' }); }).catch(() => {
      this.cleanupConfirmed = false;
      const nativeCause = [...networkFacts].some(code => code.startsWith('cast.cleanup_cause_'));
      flush();
      const cause = this.worker.cleanupFailure;
      if (!nativeCause && cause) this.observed({ closed: false, code: 'cast.cleanup_cause_' + ({ timeout: 'worker_timeout', unsupported: 'worker_error', invalid: 'invalid_message', close_timeout: 'ack_timeout' } as const)[cause] });
      this.observed({ closed: true, code: 'cast.cleanup_unknown_restart_required' });
    });
    this.modal.hidden = true; if (wasVisible) { this.root.inert = false; this.focus.leaveModal(this.root); }
    return this.closing;
  }
}
