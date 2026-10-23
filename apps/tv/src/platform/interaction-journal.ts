import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseInteractionJournal,type InteractionJournal,type InteractionJournalStore} from '../../../../packages/contracts/src/interaction-journal.ts';
import {InteractionWrites} from '../../../../packages/bili-client/src/interaction-writes.ts';
import {writeJournal} from './write-journal.ts';
const KEY='bilisofa.video-interactions.v1';
export class LocalInteractionJournal implements InteractionJournalStore{
 constructor(private readonly storage:Pick<Storage,'getItem'|'setItem'>|undefined){}
 read(){if(!this.storage)throw new DomainError('unsupported');const raw=this.storage.getItem(KEY);return{raw,value:raw===null?{schema:1 as const,revision:0,entries:[]}:parseInteractionJournal(raw)};}
 replace(expected:string|null,value:InteractionJournal){const raw=JSON.stringify(value);parseInteractionJournal(raw);if(!this.storage||this.storage.getItem(KEY)!==expected)throw new DomainError('unknown');this.storage.setItem(KEY,raw);if(this.storage.getItem(KEY)!==raw)throw new DomainError('unknown');}
}
let writes:InteractionWrites|undefined;
export function interactionWrites():InteractionWrites{if(!writes){let storage:Storage|undefined;try{storage=globalThis.localStorage;}catch{}writes=new InteractionWrites(new LocalInteractionJournal(storage),writeJournal());}return writes;}
