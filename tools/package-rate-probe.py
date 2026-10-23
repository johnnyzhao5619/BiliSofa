"""Isolated anonymous W01/G4 rate probe; main .60 and its installed files stay separate."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,re
ROOT=Path(__file__).resolve().parents[1]
def digest(v):return hashlib.sha256(v).hexdigest()
source=json.loads((ROOT/'dist/source-manifest.json').read_text())
for n,h in source['files'].items():
 if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Rate source changed since snapshot')
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text())
if candidate['libraryBuild']!=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()):raise SystemExit('Rate linked libraries stale')
for n,h in candidate['sourceInputs'].items():
 if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Rate native input stale')
files={}
for n in ['probe.js','probe.wasm','probe.data']:
 data=(ROOT/'build/network-candidate/probe'/n).read_bytes()
 if digest(data)!=candidate['outputs']['probe/'+n]:raise SystemExit('Rate native hash mismatch')
 files['native/'+n]=data
files['native/manifest.json']=(json.dumps({'schema':1,'files':{n:digest(files['native/'+n]) for n in ['probe.js','probe.wasm','probe.data']}})+'\n').encode()
for n,h in candidate['licenses'].items():
 data=(ROOT/'build/network-candidate/licenses'/n).read_bytes()
 if digest(data)!=h:raise SystemExit('Rate license mismatch')
 files['third-party-licenses/'+n]=data
for n in ['probe-worker.js','guest-video-worker.js','probe.css','icon.png','LICENSE','THIRD_PARTY_NOTICES.md']:files[n]=(ROOT/'dist/probe'/n).read_bytes()
subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),'apps/tv/src/app/rate-validation.ts','--bundle','--platform=browser','--format=iife','--target=es2020','--outfile=build/rate-ui/app.js'],cwd=ROOT,check=True,capture_output=True)
files['app.js']=(ROOT/'build/rate-ui/app.js').read_bytes()
xml=(ROOT/'apps/tv/config.xml').read_text().replace('https://bilisofa.invalid/probe','https://bilisofa.invalid/rate-validation').replace('BiliProbe1','BiliNet001').replace('BiliSofa W01 Probe','BiliSofa W01 Rate').replace('version="0.0.1"','version="0.0.17"')
files['config.xml']=xml.encode()
head=(ROOT/'dist/probe/index.html').read_text().split('<body>')[0]
head=re.sub(r'<meta name="probe-auto" content="[0-9]+">','<meta name="probe-auto" content="0">',head)
files['index.html']=(head.replace('</head>','<meta name="network-mode" content="rate"></head>')+'''<body><main><header><h1>W01 G4 · 倍速能力</h1><p>内部0.0.17 · 95秒公开视频 · 1倍 → 2倍 → 1倍</p></header><section class="actions"><button id="run" data-focus-id="run">开始倍速检查</button><button id="stop" data-focus-id="stop">停止</button><button id="report" data-focus-id="report">读取记录</button></section><p id="status" role="status"></p></main><section id="media-dialog" role="dialog" aria-modal="true" aria-labelledby="media-title" hidden><object id="avplay-object" type="application/avplayer" tabindex="-1" aria-hidden="true"></object><div class="media-top"><h2 id="media-title">倍速检查</h2><p id="media-status" role="status"></p></div><div class="media-controls"><button id="media-stop" data-focus-id="media-stop">停止并返回</button></div></section></body></html>''').encode()
build={'schema':1,'version':'0.0.17','identity':'BiliNet001.Probe','sourceHash':source['sourceHash'],'automation':'public-vod-rate-manual','authenticatedUse':'not-included','dependencies':candidate['dependencies'],'candidateManifestSha256':digest((ROOT/'build/network-candidate/manifest.json').read_bytes()),'files':{n:digest(v) for n,v in sorted(files.items())}}
files['build.json']=(json.dumps(build,indent=2)+'\n').encode()
stage=ROOT/'dist/probe-network'
if stage.is_symlink():raise SystemExit('Unsafe rate stage')
if (stage/'build.json').exists():
 old=json.loads((stage/'build.json').read_text());existing={str(p.relative_to(stage)) for p in stage.rglob('*') if p.is_file()}
 if existing!=set(old['files'])|{'build.json'}:raise SystemExit('Unknown previous stage file')
 for n,h in old['files'].items():
  p=stage/n
  if p.is_symlink() or not p.resolve().is_relative_to(stage.resolve()) or digest(p.read_bytes())!=h:raise SystemExit('Changed previous stage')
 for n in existing-set(files):(stage/n).unlink()
 for p in sorted((p for p in stage.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
  if not any(p.iterdir()):p.rmdir()
stage.mkdir(parents=True,exist_ok=True)
for n,data in files.items():
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data:raise SystemExit('Private pattern in rate package')
 p=stage/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
def archive(path,items):
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for n,data in sorted(items.items()):
   info=zipfile.ZipInfo(n,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt';archive(package,files)
package.with_suffix('.wgt.sha256').write_text(digest(package.read_bytes())+'  '+package.name+'\n')
source_archive=ROOT/'dist/BiliSofa-W01-rate-source-snapshot.zip';source_files={}
for n,h in source['files'].items():
 p=ROOT/n
 if p.is_symlink() or not p.resolve().is_relative_to(ROOT) or digest(p.read_bytes())!=h:raise SystemExit('Rate source archive changed')
 source_files[n]=p.read_bytes()
archive(source_archive,source_files)
(ROOT/'dist/NETWORK_DELIVERY.json').write_text(json.dumps({'schema':1,'version':build['version'],'applicationId':build['identity'],'automation':build['automation'],'sourceHash':source['sourceHash'],'sourceArchive':source_archive.name,'sourceArchiveSha256':digest(source_archive.read_bytes()),'package':package.name,'packageSha256':digest(package.read_bytes()),'signed':False,'deviceAcceptance':'UNVERIFIED','accountUse':'not-included','mainInstalledReceiver':'0.0.60; unchanged, exact source/signature retained separately'},indent=2)+'\n')
print('UNSIGNED isolated rate WGT '+digest(package.read_bytes())+'; TV rate/audio UNVERIFIED')
