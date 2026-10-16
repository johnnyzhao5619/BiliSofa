"""Validate the pinned AOSP dictionary and derive local search-word suggestions only."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[1];source=root/'packages/search/data'
raw=(source/'rawdict_utf16_65105_freq.txt').read_bytes();notice=(source/'AOSP-NOTICE').read_bytes()
if hashlib.sha256(raw).hexdigest()!='408700f28a56091fa07f3b849a0f134fbfc71e6b2ae9b3f52973a5b076f599ff' or hashlib.sha256(notice).hexdigest()!='b5830d96fb5a7e7e7ebcc295f352846b4b998e78fdc8f9aa68e134d2e4b39986':raise SystemExit('Pinned dictionary/notice hash mismatch')
rows=[]
for line in raw.decode('utf-16').splitlines():
 parts=line.split();word=parts[0];syllables=parts[3:]
 if not re.fullmatch(r'[\u3400-\u9fff\uf900-\ufaff\u3007]{1,4}',word) or len(syllables)!=len(word) or any(not re.fullmatch('[a-z]{1,6}',s) for s in syllables):raise SystemExit('Dictionary row outside reviewed schema')
 rows.append((float(parts[1]),word,''.join(s[0] for s in syllables)))
if len(rows)!=65105:raise SystemExit('Unexpected upstream row count')
seen=set();words=[]
for _freq,word,initials in sorted(rows,key=lambda r:(-r[0],r[1],r[2])):
 if (word,initials) not in seen:seen.add((word,initials));words.append([word,initials])
payload=(json.dumps(words,ensure_ascii=False,separators=(',',':'))+'\n').encode()
if len(payload)>2*1024*1024:raise SystemExit('Suggestion asset too large')
out=root/'dist/probe';out.mkdir(parents=True,exist_ok=True)
(out/'search-words.json').write_bytes(payload);(out/'search-NOTICE').write_bytes(notice)
print(json.dumps({'upstreamRows':len(rows),'suggestionRows':len(words),'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}))
