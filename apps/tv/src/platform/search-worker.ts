import { parseSearchRequest, parseSearchResult, type SearchRequest, type SearchResult } from '../../../../packages/contracts/src/search.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class SearchWorker extends ScopedGuestWorker<SearchRequest,SearchResult>{
  constructor(){super('search-worker.js','public-video-search',parseSearchRequest,parseSearchResult);}
}
