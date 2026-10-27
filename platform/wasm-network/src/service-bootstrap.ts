import { activateServiceProfile } from '../../../packages/contracts/src/service-configuration.ts';
interface BootstrapPort {
  onmessage: ((event: MessageEvent) => void) | null;
  __bilisofaServiceBootstrap?: (start: () => void) => void;
}
const port = globalThis as unknown as BootstrapPort;
/** Worker code is not evaluated until the app explicitly selects its profile.
 * The bootstrap message precedes business messages on the same Worker FIFO. */
port.__bilisofaServiceBootstrap = start => {
  let started = false;
  port.onmessage = event => {
    if (started) return;
    const value: unknown = event.data;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const v = value as Record<string, unknown>;
    if (Object.keys(v).length !== 2 || v.kind !== 'service-bootstrap') return;
    activateServiceProfile(v.profile);
    started = true; port.onmessage = null; start();
  };
};
