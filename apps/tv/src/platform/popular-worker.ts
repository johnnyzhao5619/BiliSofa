import { parsePopularRequest, parsePopularResult, type PopularRequest, type PopularResult } from '../../../../packages/contracts/src/index.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class PopularWorker extends ScopedGuestWorker<PopularRequest, PopularResult> {
  constructor() { super('guest-worker.js', 'guest-popular', parsePopularRequest, parsePopularResult); }
}
