import {parsePgcSearchRequest,parsePgcSearchResult,type PgcSearchRequest,type PgcSearchResult} from '../../../../packages/contracts/src/pgc-search.ts';
import {ScopedGuestWorker} from './scoped-guest-worker.ts';
export class PgcSearchWorker extends ScopedGuestWorker<PgcSearchRequest,PgcSearchResult>{
 constructor(){super('search-worker.js','public-pgc-search',parsePgcSearchRequest,parsePgcSearchResult);}
}
