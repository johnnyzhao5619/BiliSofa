"""Deterministic unsigned WGT, independent of SDK signing/installation."""
from pathlib import Path
import hashlib,json,zipfile,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
source=root/'dist/probe'
required={'config.xml','index.html','icon.png','app.js','probe-worker.js','probe.wasm','probe.css','LICENSE','THIRD_PARTY_NOTICES.md','build.json','initials-worker.js','search-words.json','search-NOTICE','guest-worker.js','guest-video-worker.js','cast-worker.js'}
files={str(p.relative_to(source)):p for p in source.rglob('*') if p.is_file()}
if not required.issubset(files): raise SystemExit('Missing build inputs: run npm run build first')
if set(files)-required: raise SystemExit('Unexpected package files; native packaging needs explicit license/build integration')
tree=ET.parse(source/'config.xml')
ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'}
content=tree.find('w:content',ns)
if content is None or content.attrib['src'] not in files: raise SystemExit('Invalid entry point')
if tree.find('t:application',ns).attrib['id']!='BiliProbe1.Probe': raise SystemExit('Unexpected package identity')
html=(source/'index.html').read_text()
if "script-src 'self' 'wasm-unsafe-eval' file://wgt-widget/" not in html: raise SystemExit('Unexpected CSP')
if 'unsafe-eval\'' in html.replace('wasm-unsafe-eval',''): raise SystemExit('Broad eval policy forbidden')
if '127.0.0.1:4173' in html: raise SystemExit('Development runtime dependency')
out=root/'dist/BiliSofa-W01-basic-unsigned.wgt'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,path in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  z.writestr(info,path.read_bytes())
digest=hashlib.sha256(out.read_bytes()).hexdigest()
(out.with_suffix('.wgt.sha256')).write_text(f'{digest}  {out.name}\n')
print(f'UNSIGNED BASIC PROBE: {out}\nSHA-256 {digest}')
