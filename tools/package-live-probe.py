"""Separate anonymous W01/G4 live package; no account/cast/write Worker included."""
from pathlib import Path
import hashlib,json,re,zipfile,subprocess
ROOT=Path(__file__).resolve().parents[1];digest=lambda v:hashlib.sha256(v).hexdigest()
source=json.loads((ROOT/'dist/source-manifest.json').read_text())
for name,h in source['files'].items():
 if digest((ROOT/name).read_bytes())!=h:raise SystemExit('Live source snapshot stale')
candidate=json.loads((ROOT/'build/network-candidate/manifest.json').read_text());live=json.loads((ROOT/'build/live-relay-candidate/manifest.json').read_text())
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
libraries=json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text())
if live['libraryBuild']!=libraries or candidate['libraryBuild']!=libraries:raise SystemExit('Live libraries stale')
for n,h in candidate['sourceInputs'].items():
 if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Reporting native source stale')
for n,h in live['sourceInputs'].items():
 if digest((ROOT/n).read_bytes())!=h:raise SystemExit('Live C source stale')
files={}
for kind,folder,manifest in [('live',ROOT/'build/live-relay-candidate',live),('native',ROOT/'build/network-candidate/probe',candidate)]:
 for n in ['probe.js','probe.wasm','probe.data']:
  data=(folder/n).read_bytes();expected=manifest['files'][n] if kind=='live' else manifest['outputs']['probe/'+n]
  if digest(data)!=expected:raise SystemExit('Live native input mismatch')
  files[kind+'/'+n]=data
 files[kind+'/manifest.json']=(json.dumps({'schema':1,'files':{n:digest(files[kind+'/'+n]) for n in ['probe.js','probe.wasm','probe.data']}})+'\n').encode()
for n,h in candidate['licenses'].items():
 data=(ROOT/'build/network-candidate/licenses'/n).read_bytes()
 if digest(data)!=h:raise SystemExit('Live license mismatch')
 files['third-party-licenses/'+n]=data
for n in ['probe-worker.js','probe.css','icon.png','LICENSE','THIRD_PARTY_NOTICES.md']:files[n]=(ROOT/'dist/probe'/n).read_bytes()
for entry,name in [('apps/tv/src/app/live-validation.ts','app.js'),('platform/wasm-network/src/live-relay-worker.ts','live-worker.js')]:
 subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),entry,'--bundle','--platform=browser','--format=iife','--target=es2020','--outfile='+str(ROOT/'build/live-ui'/name)],cwd=ROOT,check=True,capture_output=True)
 files[name]=(ROOT/'build/live-ui'/name).read_bytes()
xml=(ROOT/'apps/tv/config.xml').read_text().replace('https://bilisofa.invalid/probe','https://bilisofa.invalid/live-validation').replace('BiliProbe1','BiliNet001').replace('BiliSofa W01 Probe','BiliSofa W01 Live').replace('version="0.0.1"','version="0.0.15"').replace('  <content ', '  <access origin="http://127.0.0.1:40325" subdomains="false"/>\n  <content ')
files['config.xml']=xml.encode()
head=(ROOT/'dist/probe/index.html').read_text().split('<body>')[0]
head=re.sub(r'<meta name="probe-auto" content="[0-9]+">','<meta name="probe-auto" content="0">',head)
head=head.replace("media-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324;", "media-src 'self' http://127.0.0.1:40325;").replace("connect-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324;", "connect-src 'self' http://127.0.0.1:40323 http://127.0.0.1:40324 http://127.0.0.1:40325;")
files['index.html']=(head.replace('</head>','<meta name="network-mode" content="live"></head>')+'''<body><main><header><h1>W01 G4 · 公开直播</h1><p>内部0.0.14 · 固定公开直播间6 · 匿名HLS/TS/AVC · 不读取账号。最长90秒，可随时停止。</p></header><section class="actions"><button id="run" data-focus-id="run">播放公开直播</button><button id="stop" data-focus-id="stop">停止</button><button id="report" data-focus-id="report">读取记录</button></section><p id="status" role="status"></p></main><section id="media-dialog" role="dialog" aria-modal="true" aria-labelledby="media-title" hidden><object id="avplay-object" type="application/avplayer" tabindex="-1" aria-hidden="true"></object><div class="media-top"><h2 id="media-title">公开直播 · 声画核对</h2><p id="media-status" role="status"></p></div><div class="media-controls"><button id="media-stop" data-focus-id="media-stop">停止并返回</button></div></section></body></html>''').encode()
files['index.html']=files['index.html'].replace(b'0.0.14',b'0.0.15').replace('匿名HLS/TS/AVC'.encode(),'电视内中转HLS/TS/AVC'.encode())
files['index.html']=files['index.html'].replace(b'</head>',b'<meta name="live-auto" content="once"></head>').replace(b'0.0.15',b'0.0.16')
files['config.xml']=files['config.xml'].replace(b'0.0.15',b'0.0.16')
build={'schema':1,'version':'0.0.15','identity':'BiliNet001.Probe','sourceHash':source['sourceHash'],'automation':'public-live-relay-manual','dependencies':candidate['dependencies'],'authenticatedUse':'not-included','liveManifestSha256':digest((ROOT/'build/live-relay-candidate/manifest.json').read_bytes()),'files':{n:digest(v) for n,v in sorted(files.items())}}
build['version']='0.0.16';build['automation']='public-live-relay-auto-once'
files['build.json']=(json.dumps(build,indent=2)+'\n').encode()
stage=ROOT/'dist/probe-network'
if stage.is_symlink():raise SystemExit('Unsafe live stage')
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
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data:raise SystemExit('Private pattern in live package')
 p=stage/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,data in sorted(files.items()):
  info=zipfile.ZipInfo(n,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
package.with_suffix('.wgt.sha256').write_text(digest(package.read_bytes())+'  '+package.name+'\n')
archive=ROOT/'dist/BiliSofa-W01-live-source-snapshot.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,h in sorted(source['files'].items()):
  p=ROOT/n
  if p.is_symlink() or not p.resolve().is_relative_to(ROOT) or digest(p.read_bytes())!=h:raise SystemExit('Live archive input changed')
  info=zipfile.ZipInfo(n,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
(ROOT/'dist/NETWORK_DELIVERY.json').write_text(json.dumps({'schema':1,'version':build['version'],'applicationId':build['identity'],'automation':build['automation'],'sourceHash':source['sourceHash'],'sourceArchive':archive.name,'sourceArchiveSha256':digest(archive.read_bytes()),'package':package.name,'packageSha256':digest(package.read_bytes()),'signed':False,'deviceAcceptance':'UNVERIFIED','accountUse':'not-included','mainInstalledReceiver':'0.0.60; separately archived exact source and signature; not deployed by this tool'},indent=2)+'\n')
print('UNSIGNED isolated live WGT '+digest(package.read_bytes())+'; device playback UNVERIFIED')
