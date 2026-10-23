import {parseUserSearchRequest,parseUserSearchResult,type UserSearchRequest,type UserSearchResult} from '../../../../packages/contracts/src/user-search.ts';
import {ScopedGuestWorker} from './scoped-guest-worker.ts';
export class UserSearchWorker extends ScopedGuestWorker<UserSearchRequest,UserSearchResult>{
  constructor(){super('search-worker.js','public-user-search',parseUserSearchRequest,parseUserSearchResult);}
}
