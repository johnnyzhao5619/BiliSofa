import { serviceProfile } from '../../../../packages/contracts/src/service-configuration.ts';
/** Only local, classic packaged workers. Configuration is public endpoint data,
 * not a session or credential, and is sent before their first business message. */
export function createServiceWorker(path: string): Worker {
  const profile = serviceProfile();
  if (!/^[a-z][a-z0-9-]*\.js$/.test(path)) throw new Error('service.worker_path_invalid');
  const worker = new Worker(path);
  worker.postMessage({ kind: 'service-bootstrap', profile });
  return worker;
}
