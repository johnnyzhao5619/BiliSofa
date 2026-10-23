"""W04 whole-package negative gates. Synthetic stage mutations are restored.
No signing, device install, external requests, or account mutations.
"""
from pathlib import Path
import importlib.util,hashlib,json,subprocess,unittest
spec=importlib.util.spec_from_file_location('legacy_package',Path(__file__).with_name('foundation-packaging.test.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
ROOT=base.ROOT;base.STAGE=ROOT/'dist/w04-app';base.PACKAGE=ROOT/'dist/BiliSofa-W04-media-unsigned.wgt'
def sha(data):return hashlib.sha256(data).hexdigest()
class W04Packaging(base.FoundationPackaging):
 def rejected(self,expected):
  before=sha(base.PACKAGE.read_bytes());r=subprocess.run(['python3','tools/package-foundation-app.py','--w04'],cwd=ROOT,capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0);self.assertIn(expected,r.stdout+r.stderr);self.assertEqual(sha(base.PACKAGE.read_bytes()),before)
 def module(self,folder,mutation,expected,manifest_mutation=None):
  directory=ROOT/'build'/folder;path=directory/'manifest.json';saved=path.read_bytes();wasm=directory/'probe.wasm';original=wasm.read_bytes()
  try:
   module=json.loads(saved)
   if mutation is not None:wasm.write_bytes(mutation(original));module['files']['probe.wasm']=sha(wasm.read_bytes())
   if manifest_mutation:manifest_mutation(module)
   path.write_text(json.dumps(module));self.rejected(expected)
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_each_w04_runtime_requires_exact_ca_and_library_provenance(self):
  for folder in ['vod','vod-api','pgc-read','pgc-follow','live-read','live-product']:
   with self.subTest(folder=folder):self.module(folder,None,'W04 native provenance mismatch',lambda m:m.update(caSha256='0'*64))
 def test_stale_live_source_cannot_be_hidden_by_native_manifest(self):
  self.module('live-product',None,'Foundation input digest mismatch',lambda m:m['sourceInputs'].update({'platform/wasm-network/src/live-product.c':'0'*64}))
 def test_missing_pgc_episode_route_cannot_fall_back_to_ugc(self):
  self.module('pgc-read',lambda b:b.replace(b'/pgc/player/web/playurl?',b'/pgc/player/web/blocked?'),'W04 native fixed route missing')
 def test_pgc_write_is_only_in_dedicated_lane_and_exact_form_is_required(self):
  self.module('pgc-follow',lambda b:b.replace(b'season_id=%s&csrf=%s',b'season_id=%s&nope=%s'),'W04 native fixed route missing')
  self.module('pgc-read',lambda b:b+b'/pgc/web/follow/add','W04 native unrelated route')
 def test_live_messaging_cannot_add_a_write_or_login_route(self):
  self.module('live-read',lambda b:b+b'/heartbeat','W04 native unrelated route')
 def test_live_follows_cannot_change_real_source_batch_or_route(self):
  self.module('live-read',lambda b:b.replace(b'page_size=9&ignoreRecord=1',b'page_size=4&ignoreRecord=1'),'W04 native fixed route missing')
 def test_stale_bridge_probe_policy_is_rejected(self):
  self.module('vod',None,'W04 bridge still has probe quotas',lambda m:m['policy'].update(cumulativeProbeQuotas=True))
 def test_rehashed_native_script_must_not_add_dynamic_execution(self):
  directory=ROOT/'build/live-product';path=directory/'manifest.json';script=directory/'probe.js';saved=path.read_bytes();original=script.read_bytes()
  try:
   script.write_bytes(original+b'\nnew Function("synthetic")');module=json.loads(saved);module['files']['probe.js']=sha(script.read_bytes());path.write_text(json.dumps(module));self.rejected('W04 native runtime policy mismatch')
  finally:script.write_bytes(original);path.write_bytes(saved)
 def test_missing_required_productinfo_permission_is_rejected_even_after_rehash(self):
  path=base.STAGE/'config.xml';manifest=base.STAGE/'ui-manifest.json';saved=manifest.read_bytes();original=path.read_bytes()
  try:
   marker=b'  <tizen:privilege name="http://developer.samsung.com/privilege/productinfo"/>\n';self.assertIn(marker,original)
   path.write_bytes(original.replace(marker,b''));ui=json.loads(saved);ui['files']['config.xml']=sha(path.read_bytes());manifest.write_text(json.dumps(ui));self.rejected('Foundation network privilege mismatch')
  finally:path.write_bytes(original);manifest.write_bytes(saved)
 def test_w04_cannot_be_relabeled_as_previous_version(self):
  path=base.STAGE/'config.xml';manifest=base.STAGE/'ui-manifest.json';saved=manifest.read_bytes();original=path.read_bytes()
  try:
   path.write_bytes(original.replace(b'0.21.4',b'0.20.0'));ui=json.loads(saved);ui['files']['config.xml']=sha(path.read_bytes());manifest.write_text(json.dumps(ui));self.rejected('Foundation identity mismatch')
  finally:path.write_bytes(original);manifest.write_bytes(saved)
 def test_w04_csp_cannot_gain_remote_or_dynamic_script_access(self):
  path=base.STAGE/'index.html';manifest=base.STAGE/'ui-manifest.json';saved=manifest.read_bytes();original=path.read_bytes()
  try:
   path.write_bytes(original.replace(b"connect-src 'self'",b"connect-src * 'self'"));ui=json.loads(saved);ui['files']['index.html']=sha(path.read_bytes());manifest.write_text(json.dumps(ui));self.rejected('W04 CSP mismatch')
  finally:path.write_bytes(original);manifest.write_bytes(saved)
 def test_private_markers_never_reach_whole_package_even_rehashed(self):
  path=base.STAGE/'app.js';manifest=base.STAGE/'ui-manifest.json';saved=manifest.read_bytes();original=path.read_bytes()
  try:
   path.write_bytes(original+b'\n/* SESSDATA=synthetic */');ui=json.loads(saved);ui['files']['app.js']=sha(path.read_bytes());manifest.write_text(json.dumps(ui));self.rejected('Foundation private or unsafe payload')
  finally:path.write_bytes(original);manifest.write_bytes(saved)
if __name__=='__main__':unittest.main()
