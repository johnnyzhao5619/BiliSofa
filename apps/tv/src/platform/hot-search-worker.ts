import { parseHotSearchRequest, parseHotSearchResult, type HotSearchRequest, type HotSearchResult } from '../../../../packages/contracts/src/hot-search.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class HotSearchWorker extends ScopedGuestWorker<HotSearchRequest,HotSearchResult>{
  constructor(){super('hot-search-worker.js','public-search-hot',parseHotSearchRequest,parseHotSearchResult);}
}
