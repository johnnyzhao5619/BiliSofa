import {parseLiveSearchRequest,parseLiveSearchResult,type LiveSearchRequest,type LiveSearchResult} from '../../../../packages/contracts/src/live-search.ts';
import {ScopedGuestWorker} from './scoped-guest-worker.ts';
export class LiveSearchWorker extends ScopedGuestWorker<LiveSearchRequest,LiveSearchResult>{
 constructor(){super('search-worker.js','public-live-search',parseLiveSearchRequest,parseLiveSearchResult);}
}
