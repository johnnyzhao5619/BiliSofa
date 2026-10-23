import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parseNetworkValidationRequest, parseNetworkValidationResult, type NetworkValidationRequest, type NetworkValidationResult } from '../../../../packages/contracts/src/network-validation.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class NetworkValidationWorker extends ScopedGuestWorker<NetworkValidationRequest, NetworkValidationResult> {
  constructor(mode: 'tls' | 'https-session' = 'tls') {
    const operation = mode === 'tls' ? 'network-validation' : 'https-session-validation';
    super('network-validation-worker.js', operation, value => {
      const request = parseNetworkValidationRequest(value);
      if (request.operation !== operation) throw new DomainError('invalid');
      return request;
    }, parseNetworkValidationResult, mode === 'tls' ? 45000 : 55000, 5000, (request, result) => request.operation === result.operation, true, 7, true);
  }
}
