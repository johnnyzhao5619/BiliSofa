"""Explicit separate W01 network WGT. Never changes the normal probe's native artifacts."""
from pathlib import Path
import hashlib, json, re, zipfile, sys, subprocess
ROOT = Path(__file__).resolve().parents[1]
session_mode='--session' in sys.argv[1:]
https_mode='--https-session' in sys.argv[1:]
reconcile_mode='--account-reconcile' in sys.argv[1:]
account_mode='--account' in sys.argv[1:] or reconcile_mode
if reconcile_mode and '--account' in sys.argv[1:]: raise SystemExit('Choose one account mode')
if sum([session_mode, https_mode, account_mode])>1: raise SystemExit('Choose one network mode')
def digest(data): return hashlib.sha256(data).hexdigest()
def checked(path, expected):
 if path.is_symlink() or digest(path.read_bytes()) != expected: raise SystemExit('Candidate input hash mismatch: '+path.name)
 return path.read_bytes()
candidate = ROOT/'build/network-candidate'; stage = ROOT/'dist/probe-network'
manifest = json.loads((candidate/'manifest.json').read_text())
subprocess.run(['python3',str(ROOT/'tools/build-network-candidate.py'),'check'],check=True)
if manifest['libraryBuild'] != json.loads((ROOT/'.local/network-upgrade/candidate-libraries.json').read_text()): raise SystemExit('Candidate linked libraries are stale')
source = json.loads((ROOT/'dist/source-manifest.json').read_text())
for name, expected in source['files'].items(): checked(ROOT/name, expected)
for name, expected in manifest['sourceInputs'].items(): checked(ROOT/name, expected)
ui = ROOT/'build/network-ui'; ui_manifest = json.loads((ui/'manifest.json').read_text())
if ui_manifest['sourceHash'] != source['sourceHash']: raise SystemExit('Candidate UI source mismatch')
files = {name: checked(ui/name, expected) for name, expected in ui_manifest['files'].items()}
if account_mode:
 if ui_manifest.get('qrDependency')!=json.loads((ROOT/'platform/third-party/qrcode-generator.lock.json').read_text()): raise SystemExit('QR dependency provenance mismatch')
 files['app.js']=files.pop('account-app.js');files.pop('network-validation-worker.js')
 if reconcile_mode: files.pop('progress-worker.js')
else:
 files.pop('account-app.js');files.pop('account-worker.js');files.pop('progress-worker.js')
if not reconcile_mode: files.pop('account-readback-worker.js')
for kind, prefix in [('probe','native'),('validation','validation'),('https-session','https-session')] + ([('account','account')] if account_mode else []) + ([('account-readback','account-readback')] if reconcile_mode else []) + ([('progress-post','progress-post')] if account_mode and not reconcile_mode else []):
 items = {}
 for name in ['probe.js','probe.wasm'] + ([] if kind == 'https-session' else ['probe.data']):
  data = checked(candidate/kind/name, manifest['outputs'][kind+'/'+name]); files[prefix+'/'+name] = data; items[name] = digest(data)
 if files[prefix+'/probe.wasm'][:8] != b'\0asm\1\0\0\0': raise SystemExit('Candidate not WASM')
 if prefix == 'validation' and digest(files[prefix+'/probe.data']) != 'a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505': raise SystemExit('Validation CA differs from snapshot')
 files[prefix+'/manifest.json'] = (json.dumps({'schema':1,'files':items,'dependencies':manifest['dependencies']},indent=2)+'\n').encode()
for name, expected in manifest['licenses'].items(): files['third-party-licenses/'+name] = checked(candidate/'licenses'/name,expected)
files['third-party-licenses/manifest.json'] = (json.dumps({'files':manifest['licenses'],'dependencies':manifest['dependencies']},indent=2)+'\n').encode()
for name in ['probe-worker.js','session-worker.js','probe.css','icon.png','LICENSE','THIRD_PARTY_NOTICES.md']: files[name] = (ROOT/'dist/probe'/name).read_bytes()
# The reporting Worker is reused as built, with no production account paths.
if digest(files['probe-worker.js']) != digest((ROOT/'dist/probe/probe-worker.js').read_bytes()): raise SystemExit('Reporter mismatch')
xml=(ROOT/'apps/tv/config.xml').read_text().replace('https://bilisofa.invalid/probe','https://bilisofa.invalid/network-validation').replace('BiliProbe1','BiliNet001').replace('BiliSofa W01 Probe','BiliSofa W01 Network')
files['config.xml']=xml.encode()
if account_mode:
 license_path=ROOT/'platform/third-party/qrcode-generator-LICENSE.txt'
 if digest(license_path.read_bytes())!='3a850fa5f08101db6f40676c2786e10bd2cd5fff7b12ffdf1e0c434d4e49d90c': raise SystemExit('QR license mismatch')
 files['third-party-licenses/qrcode-generator-MIT.txt']=license_path.read_bytes()
base=(ROOT/'dist/probe/index.html').read_text();head=base[:base.index('<body>')];head=re.sub(r'<meta name="probe-auto" content="[0-9]+">','<meta name="probe-auto" content="0">',head)
files['index.html']=(head+'''<body><main><header><h1>W01 · 现代网络依赖验证</h1><p>独立测试包 0.0.1 · 固定匿名请求 · 不接收账号信息</p></header><section class="actions"><button id="run" data-focus-id="run">重新检查</button><button id="stop" data-focus-id="stop">停止</button><button id="report" data-focus-id="report">读取记录</button><button id="export" data-focus-id="export">查看脱敏记录</button></section><p id="status" role="status"></p><p id="lan-status" role="status"></p><pre id="results"></pre><textarea id="export-output" data-focus-id="export-output" data-return-focus-id="export" hidden readonly aria-label="脱敏记录"></textarea></main><section id="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title" hidden><h2 id="exit-title">退出网络验证？</h2><button id="cancel-exit" data-focus-id="cancel-exit">继续</button><button id="confirm-exit" data-focus-id="confirm-exit">退出</button></section></body></html>''').encode()
files['index.html']=files['index.html'].decode().replace('</head>', '<meta name="network-mode" content="'+('account' if account_mode else 'https-session' if https_mode else 'session' if session_mode else 'tls')+'"></head>').replace('<button id="run"', '<button id="https-session" data-focus-id="https-session">HTTPS会话隔离</button><button id="session" data-focus-id="session">HTTP会话隔离</button><button id="run"').encode()
if account_mode:
 files['index.html']=(head.replace('</head>','<meta name="network-mode" content="account"></head>')+'''<body><main><header><h1>W01 · 扫码与云进度只读检查</h1><p>指定 BV14GHy6bE9n · 首P95秒；本轮不写入云进度。登录后仅将本次会话存电视保护存储，用于重开核对，完成后可清除。</p></header><section class="actions"><button id="login" data-focus-id="login">开始扫码登录（只读）</button><button id="restore" data-focus-id="restore">验证重开后的会话</button><button id="clear" data-focus-id="clear">清除电视测试会话</button><button id="stop" data-focus-id="stop">停止</button><button id="report" data-focus-id="report">读取状态</button></section><p id="status" role="status">先选开始扫码登录</p><canvas id="qr" hidden aria-label="官方扫码登录二维码"></canvas><p id="identity"></p><p id="position"></p><p id="lan-status"></p></main><section id="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title" hidden><h2 id="exit-title">退出只读检查？</h2><button id="cancel-exit" data-focus-id="cancel-exit">继续</button><button id="confirm-exit" data-focus-id="confirm-exit">退出</button></section></body></html>''').encode()
if account_mode and not reconcile_mode:
 files['index.html']=files['index.html'].replace(b'content="account"',b'content="account-progress"').replace('本轮不写入云进度。'.encode(),'先只读预览；仅在明确确认后写回一次15秒。'.encode()).replace('<h1>W01 · 扫码与云进度只读检查</h1>'.encode(),'<h1>W01 · 云进度一次写回候选</h1>'.encode()).replace(b'<button id="clear"','<button id="preview-progress" data-focus-id="preview-progress">只读预览15秒目标</button><button id="confirm-progress" data-focus-id="confirm-progress" disabled>确认写回一次：15秒</button><button id="clear"'.encode())
if reconcile_mode:
 files['index.html']=files['index.html'].replace(b'content="account"',b'content="account-reconcile-compare"').replace('<h1>W01 · 扫码与云进度只读检查</h1>'.encode(),'<h1>W01 · 已提交进度的只读核查</h1>'.encode()).replace('本轮不写入云进度。'.encode(),'核查同一账号已提交的15秒目标，本包不含进度写入模块。'.encode()).replace('验证重开后的会话'.encode(),'只读核查当前进度'.encode())
version='0.0.13' if reconcile_mode else '0.0.11' if account_mode else '0.0.7' if https_mode else '0.0.5' if session_mode else '0.0.6'
files['index.html']=files['index.html'].replace(b'0.0.1',version.encode())
files['config.xml']=files['config.xml'].replace(b'version="0.0.1"',('version="'+version+'"').encode())
build={'schema':1,'version':version,'identity':'BiliNet001.Probe','sourceHash':source['sourceHash'],'automation':'account-progress-reconcile-readonly-manual' if reconcile_mode else 'account-progress-preview-manual' if account_mode else 'network-https-session-validation-once' if https_mode else 'network-session-validation-once' if session_mode else 'network-tls-validation-once','dependencies':manifest['dependencies'],'candidateManifestSha256':digest((candidate/'manifest.json').read_bytes()),'files':{n:digest(v) for n,v in sorted(files.items())},'authenticatedUse':'UNVERIFIED'}
if account_mode: build['qrDependency']=ui_manifest['qrDependency']
files['build.json']=(json.dumps(build,indent=2)+'\n').encode()
for name,data in files.items():
 if b'/Users/' in data or b'-----BEGIN PRIVATE KEY-----' in data or b'SESSDATA=' in data or b'bili_jct=' in data: raise SystemExit('Private pattern in network candidate')
if stage.is_symlink(): raise SystemExit('Unsafe candidate stage')
if (stage/'build.json').exists():
 previous=json.loads((stage/'build.json').read_text())
 existing={str(p.relative_to(stage)) for p in stage.rglob('*') if p.is_file()}
 if existing!=set(previous['files'])|{'build.json'}: raise SystemExit('Unexpected existing candidate stage files')
 for name,expected in previous['files'].items():
  path=stage/name
  if not path.resolve().is_relative_to(stage.resolve()) or path.is_symlink() or digest(path.read_bytes())!=expected: raise SystemExit('Changed previous candidate stage')
 for name in existing-set(files): (stage/name).unlink()
 # Mode changes only remove verified generated files, never unknown source or old signed archives.
 for folder in sorted((p for p in stage.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
  if not any(folder.iterdir()): folder.rmdir()
stage.mkdir(parents=True,exist_ok=True)
for name,data in files.items():
 p=stage/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
if {str(p.relative_to(stage)) for p in stage.rglob('*') if p.is_file()} != set(files): raise SystemExit('Unexpected candidate stage files')
package=ROOT/'dist/BiliSofa-W01-network-unsigned.wgt'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
package.with_suffix('.wgt.sha256').write_text(digest(package.read_bytes())+'  '+package.name+'\n')
print('UNSIGNED separate network candidate '+digest(package.read_bytes())+'; no TV or credential acceptance')
