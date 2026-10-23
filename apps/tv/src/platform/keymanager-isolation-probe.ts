import type { KeyManagerProbeResult, ProbeKeyManagerApi } from './keymanager-probe.ts';
// A single, explicitly owned synthetic fixture. No arbitrary aliases, mutation,
// enumeration, permission grants, value comparison or value export in the observer.
export function probeForeignSyntheticRead(api: Pick<ProbeKeyManagerApi, 'getData'> | undefined, fixture: 'legacy' | 'https-vault' = 'legacy'): KeyManagerProbeResult {
  if (!api || typeof api.getData !== 'function') return { verdict: 'BLOCKED', code: 'keymanager.observer_api_unavailable' };
  try {
    api.getData(fixture === 'https-vault' ? { name: 'bilisofa.w01.https-vault.v1', packageId: 'BiliNet001' } : { name: 'bilisofa.w01.persistence.v1', packageId: 'BiliProbe1' });
    return { verdict: 'FAIL', code: 'keymanager.foreign_fixture_unexpectedly_readable' };
  } catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
    // NotFound alone is not isolation proof: the owner must prove presence both
    // before and after this observation. Unknown/invalid-argument errors are not denial.
    if (name === 'NotFoundError' || name === 'SecurityError') return { verdict: 'UNVERIFIED', code: name === 'NotFoundError' ? 'keymanager.foreign_fixture_not_found' : 'keymanager.foreign_fixture_security_denied' };
    return { verdict: 'FAIL', code: 'keymanager.foreign_fixture_read_error_unclassified' };
  }
}
