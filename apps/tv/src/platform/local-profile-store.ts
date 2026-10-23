import {parseVodTrackPreference,type VodTrackPreference} from '../../../../packages/contracts/src/vod-catalog.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import {parseResumeLabel, parseResumeLabels, type ResumeLabels} from '../../../../packages/contracts/src/resume-label.ts';
import { defaults, localOwner, parseLocalProfile, parsePreferences, parseResumePoint, parsePartResumePoint, parsePartResumes, type LocalRead, type LocalWrite, type PlaybackPreferences, type ProfileStore, type ResumePoint, type PartResumeRead, type PartResumePoint, type LocalIssue } from '../../../../packages/contracts/src/local-profile.ts';
type StorageApi = Pick<Storage,'getItem' | 'setItem' | 'removeItem'>;
/** Bounded ordinary preferences/viewing data, never credentials. No key
 * enumeration, global clear, automatic migration or corrupt-data overwrite. */
export class LocalProfiles {
  private readonly trackIntents=new Map<string,VodTrackPreference>();
  constructor(private readonly storage: StorageApi | undefined) {}
  profile(owner: string): ProfileStore {
    const identity=localOwner(owner);
    const key = 'bilisofa.local.v1.' + identity, partKey = 'bilisofa.parts.v1.' + localOwner(owner), storage = this.storage;
    const labelKey = 'bilisofa.resume-labels.v1.' + identity, continuousKey = 'bilisofa.playback-continuous.v1.' + identity;
    const readLabels = (): {kind:'ok';value:ResumeLabels} | {kind:'unavailable'|'corrupt'|'future'} => {
      if (!storage) return {kind:'unavailable'};
      let raw: string | null;
      try { raw = storage.getItem(labelKey); } catch { return {kind:'unavailable'}; }
      if (raw === null) return {kind:'ok',value:{schema:1,items:[]}};
      try { return {kind:'ok',value:parseResumeLabels(raw)}; }
      catch (e) { return {kind:e instanceof DomainError && e.code==='unsupported'?'future':'corrupt'}; }
    };
    const writeLabels = (value:ResumeLabels):LocalWrite => {
      const raw=JSON.stringify(value); parseResumeLabels(raw);
      try { storage!.setItem(labelKey,raw); return storage!.getItem(labelKey)===raw?'saved':'unconfirmed'; }
      catch { return 'unconfirmed'; }
    };
    const deleteLabels = ():LocalWrite => {
      if (!storage) return 'unavailable';
      try { storage.removeItem(labelKey); return storage.getItem(labelKey)===null?'deleted':'unconfirmed'; }
      catch { return 'unconfirmed'; }
    };
    const forgetLabel = (bvid:string,part:number):LocalWrite => {
      const result=readLabels(); if(result.kind!=='ok')return result.kind;
      const items=result.value.items.filter(p=>p.bvid!==bvid||p.part!==part);
      return items.length===result.value.items.length?'saved':writeLabels({schema:1,items});
    };
    const read = (): LocalRead => {
      if (!storage) return { kind: 'unavailable' };
      let raw: string | null;
      try { raw = storage.getItem(key); } catch { return { kind: 'unavailable' }; }
      if (raw === null) return { kind: 'ok', value: defaults() };
      try { return { kind: 'ok', value: parseLocalProfile(raw) }; }
      catch (error) { return { kind: error instanceof DomainError && error.code === 'unsupported' ? 'future' : 'corrupt' }; }
    };
    const write = (change: (value: Extract<LocalRead,{kind:'ok'}>['value']) => void): LocalWrite => {
      const result = read(); if (result.kind !== 'ok') return result.kind;
      change(result.value); const raw = JSON.stringify(result.value); parseLocalProfile(raw);
      try { storage!.setItem(key, raw); return storage!.getItem(key) === raw ? 'saved' : 'unconfirmed'; }
      catch { return 'unconfirmed'; }
    };
    const readParts = (): { kind: 'ok'; value: ReturnType<typeof parsePartResumes> } | { kind: LocalIssue } => {
      if (!storage) return { kind: 'unavailable' };
      let raw: string | null;
      try { raw = storage.getItem(partKey); } catch { return { kind: 'unavailable' }; }
      if (raw === null) return { kind: 'ok', value: { schema: 1, resume: [] } };
      try { return { kind: 'ok', value: parsePartResumes(raw) }; }
      catch (error) { return { kind: error instanceof DomainError && error.code === 'unsupported' ? 'future' : 'corrupt' }; }
    };
    const writeParts = (change: (value: ReturnType<typeof parsePartResumes>) => void): LocalWrite => {
      const result = readParts();
      if (result.kind !== 'ok') return result.kind;
      change(result.value); const raw = JSON.stringify(result.value); parsePartResumes(raw);
      try { storage!.setItem(partKey, raw); return storage!.getItem(partKey) === raw ? 'saved' : 'unconfirmed'; }
      catch { return 'unconfirmed'; }
    };
    const profile: ProfileStore = {
      readLabel(bvid,part){
        const position=profile.readPart(bvid,part); if(position.kind!=='ok')return {kind:position.kind==='unconfirmed'?'unavailable':position.kind};
        if(!position.value)return {kind:'ok'};
        const result=readLabels(); if(result.kind!=='ok')return result;
        const value=result.value.items.find(p=>p.bvid===bvid&&p.part===part);
        return {kind:'ok',...(value?{value:{...value}}:{})};
      },
      rememberLabel(value){
        const parsed=parseResumeLabel(value), inventory=profile.bookmarks!();
        if(inventory.kind!=='ok')return inventory.kind;
        if(!inventory.items.some(p=>p.bvid===parsed.bvid&&p.part===parsed.part))return 'unconfirmed';
        const result=readLabels();if(result.kind!=='ok')return result.kind;
        const valid=new Set(inventory.items.map(p=>`${p.bvid}:p${p.part}`));
        const retained=result.value.items.filter(p=>valid.has(`${p.bvid}:p${p.part}`));
        const previous=retained.find(p=>p.bvid===parsed.bvid&&p.part===parsed.part);
        if(retained.length===result.value.items.length&&previous?.title===parsed.title&&previous.partTitle===parsed.partTitle)return 'saved';
        return writeLabels({schema:1,items:[parsed,...retained.filter(p=>p.bvid!==parsed.bvid||p.part!==parsed.part)].slice(0,192)});
      },
      bookmarks(){
        const first=read(),parts=readParts();if(first.kind!=='ok')return first;if(parts.kind!=='ok')return parts;
        return {kind:'ok',items:[...first.value.resume,...parts.value.resume].map(p=>({...p})).sort((a,b)=>b.updatedAt-a.updatedAt||a.bvid.localeCompare(b.bvid)||a.part-b.part)};
      },
      clearBookmarks(){
        const first=read(),parts=readParts();if(first.kind!=='ok')return first.kind;if(parts.kind!=='ok')return parts.kind;
        const a=write(doc=>{doc.resume=[];});if(a!=='saved')return a;const b=writeParts(doc=>{doc.resume=[];});
        if(b!=='saved')return 'unconfirmed';return deleteLabels()==='deleted'?'deleted':'unconfirmed';
      },
      readTracks:()=>{const value=this.trackIntents.get(identity);return value?{...value}:undefined;},
      rememberTracks:value=>{const parsed=parseVodTrackPreference(value);this.trackIntents.delete(identity);if(this.trackIntents.size>=16)this.trackIntents.delete(this.trackIntents.keys().next().value!);this.trackIntents.set(identity,parsed);},
      readContinuous:()=>{if(!storage)return undefined;try{const raw=storage.getItem(continuousKey);return raw==='1'?true:raw==='0'?false:undefined;}catch{return undefined;}},
      rememberContinuous:value=>{if(!storage)return 'unavailable';const raw=value?'1':'0';try{storage.setItem(continuousKey,raw);return storage.getItem(continuousKey)===raw?'saved':'unconfirmed';}catch{return 'unconfirmed';}},
      read,
      preferences(value: PlaybackPreferences) { const parsed = parsePreferences(value); return write(doc => { doc.preferences = parsed; }); },
      progress(value: ResumePoint) { const parsed = parseResumePoint(value); return write(doc => { doc.resume = [parsed,...doc.resume.filter(r => r.bvid !== parsed.bvid)].slice(0,64); }); },
      forget(bvid: string) { if (!/^BV[A-Za-z0-9]{10}$/.test(bvid)) throw new DomainError('invalid'); const result=write(doc => { doc.resume = doc.resume.filter(r => r.bvid !== bvid); });return result!=='saved'?result:forgetLabel(bvid,1)==='saved'?'saved':'unconfirmed'; },
      readPart(bvid: string, part: number): PartResumeRead {
        // Validate identities before touching either partition.
        parsePartResumePoint({ bvid, part, timeMs: 1, durationMs: 2, updatedAt: 1 });
        if (part === 1) {
          const result = read();
          if (result.kind !== 'ok') return result;
          const value = result.value.resume.find(p => p.bvid === bvid);
          return { kind: 'ok', ...(value ? { value: { ...value } } : {}) };
        }
        const result = readParts();
        if (result.kind !== 'ok') return result;
        const value = result.value.resume.find(p => p.bvid === bvid && p.part === part);
        return { kind: 'ok', ...(value ? { value: { ...value } } : {}) };
      },
      progressPart(value: PartResumePoint) {
        const parsed = parsePartResumePoint(value);
        if (parsed.part === 1) return profile.progress({ ...parsed, part: 1 });
        return writeParts(doc => { doc.resume = [parsed, ...doc.resume.filter(p => p.bvid !== parsed.bvid || p.part !== parsed.part)].slice(0, 128); });
      },
      forgetPart(bvid: string, part: number) {
        parsePartResumePoint({ bvid, part, timeMs: 1, durationMs: 2, updatedAt: 1 });
        if (part === 1) return profile.forget(bvid);
        const result=writeParts(doc => { doc.resume = doc.resume.filter(p => p.bvid !== bvid || p.part !== part); });
        return result!=='saved'?result:forgetLabel(bvid,part)==='saved'?'saved':'unconfirmed';
      },
      clear: () => { this.trackIntents.delete(identity);
        if (!storage) return 'unavailable';
        let confirmed = true;
        for (const target of [key, partKey, labelKey, continuousKey]) {
          try { storage.removeItem(target); if (storage.getItem(target) !== null) confirmed = false; }
          catch { confirmed = false; }
        }
        return confirmed ? 'deleted' : 'unconfirmed';
      },
    };
    return profile;
  }
}
export function localProfiles(): LocalProfiles {
  try { return new LocalProfiles(globalThis.localStorage); } catch { return new LocalProfiles(undefined); }
}
