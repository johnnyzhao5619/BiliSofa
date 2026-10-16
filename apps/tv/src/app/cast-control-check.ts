import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PlayerCoordinator } from '../../../../packages/media/src/player.ts';
// Internal, explicitly TV-approved probe. Timeline/SDK evidence only, never A/V acceptance.
export async function checkCastControls(player: Pick<PlayerCoordinator, 'state' | 'timeMs' | 'seeking'>, seek: () => Promise<void>, signal: AbortSignal, stage: (code: string) => void, now: () => number = () => performance.now()): Promise<void> {
  const pause = () => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DomainError('cancelled')); return; }
    const stop = () => { clearTimeout(timer); reject(new DomainError('cancelled')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, 250);
    signal.addEventListener('abort', stop, { once: true });
  });
  const alive = () => { if (signal.aborted) throw new DomainError('cancelled'); if (player.state !== 'playing') throw new DomainError('network'); };
  const until = async (predicate: () => boolean, ms: number) => {
    const deadline = now() + ms;
    while (true) { alive(); if (predicate()) return; if (now() >= deadline) throw new DomainError('timeout'); await pause(); }
  };
  for (let i = 1; i <= 3; i++) {
    stage(`avplay.control_check_wait_${i}`); await until(() => player.timeMs >= 10500 && !player.seeking, 20000);
    let targetSeen = false;
    const observe = () => { if (player.timeMs >= 3500 && player.timeMs <= 8000) targetSeen = true; };
    const observation = setInterval(observe, 250);
    try {
      stage(`avplay.control_check_seek_${i}`); await seek(); observe();
      stage(`avplay.control_check_target_${i}`); await until(() => { observe(); return targetSeen; }, 8000);
    } finally { clearInterval(observation); }
  }
  stage('avplay.control_check_observe_35');
  for (let i = 0; i < 4; i++) {
    const before = player.timeMs, duration = i === 3 ? 5000 : 10000, end = now() + duration;
    while (now() < end) { alive(); await pause(); }
    alive(); if (player.timeMs < before + duration / 2) throw new DomainError('timeout');
  }
}
