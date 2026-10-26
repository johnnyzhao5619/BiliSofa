"""Single product build: CSP/privilege (tv.inputdevice), package identity and native-module negative checks; no signing/device."""
from pathlib import Path
import hashlib,json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[2];STAGE=ROOT/'dist/bilisofa-app'
class ProductPackage(unittest.TestCase):
 def rejected(self,name,change,reason,rehash=True):
  manifest=STAGE/'ui-manifest.json';old_manifest=manifest.read_bytes();path=STAGE/name;old=path.read_bytes()
  try:
   path.write_bytes(change(old))
   if rehash:
    value=json.loads(old_manifest);value['files'][name]=hashlib.sha256(path.read_bytes()).hexdigest();manifest.write_text(json.dumps(value))
   result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True,timeout=45)
   self.assertNotEqual(result.returncode,0);self.assertIn(reason,result.stdout+result.stderr)
  finally:path.write_bytes(old);manifest.write_bytes(old_manifest)
 def test_csp_wildcard_is_rejected(self):self.rejected('index.html',lambda b:b.replace(b"connect-src 'self'",b"connect-src * 'self'"),'W04 CSP mismatch')
 def test_remote_script_is_rejected(self):self.rejected('index.html',lambda b:b.replace(b"script-src 'self'",b"script-src https: 'self'"),'W04 CSP mismatch')
 def test_unscoped_image_origin_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'https://i0.hdslb.com',b'https://outside.invalid'),'Foundation network privilege mismatch')
 def test_wrong_version_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'version="0.60.0"',b'version="0.59.0"'),'Foundation identity mismatch')
 def test_credential_like_payload_is_rejected(self):self.rejected('app.js',lambda b:b+b'\n/* SESSDATA=synthetic */','Foundation private or unsafe payload')
 def test_missing_input_privilege_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'  <tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>\n',b''),'Foundation network privilege mismatch')
 def test_extra_privilege_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'privilege/tv.inputdevice"/>',b'privilege/tv.inputdevice"/>\n  <tizen:privilege name="http://tizen.org/privilege/mediastorage"/>'),'Foundation network privilege mismatch')
 def test_file_mismatch_is_rejected(self):self.rejected('app.js',lambda b:b+b'\n','Foundation input digest mismatch',False)
 def test_bridge_without_failover_is_rejected(self):
  # ADR-101: the package must carry the failover bridge (build/vod-failover), never the frozen build/vod.
  manifest=ROOT/'build/vod-failover/manifest.json';old=manifest.read_bytes()
  try:
   value=json.loads(old);value['policy']['failoverPerTrack']=0;manifest.write_text(json.dumps(value))
   result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True,timeout=45)
   self.assertNotEqual(result.returncode,0);self.assertIn('0.50.3 bridge failover missing',result.stdout+result.stderr)
  finally:manifest.write_bytes(old)
 def test_source_module_without_akamai_rule_is_rejected(self):
  # ADR-102/112: both source modules come from their pair directories with the widened check rule.
  for folder in ['vod-api-pair','pgc-read-pair']:
   manifest=ROOT/'build'/folder/'manifest.json';old=manifest.read_bytes()
   try:
    value=json.loads(old);value['policy']['sourceCheckHosts']=['*.bilivideo.com'];manifest.write_text(json.dumps(value))
    result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True,timeout=45)
    self.assertNotEqual(result.returncode,0);self.assertIn('0.50.4 source check failover missing',result.stdout+result.stderr)
   finally:manifest.write_bytes(old)
 def test_source_module_without_parallel_check_is_rejected(self):
  # ADR-112: a source module linked without vod-source-pair.h is not packaged.
  for folder in ['vod-api-pair','pgc-read-pair']:
   manifest=ROOT/'build'/folder/'manifest.json';old=manifest.read_bytes()
   try:
    value=json.loads(old);value['sourceInputs']={k:v for k,v in value['sourceInputs'].items() if not k.endswith('vod-source-pair.h')};manifest.write_text(json.dumps(value))
    result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True,timeout=45)
    self.assertNotEqual(result.returncode,0);self.assertIn('ADR-112 parallel source check missing',result.stdout+result.stderr)
   finally:manifest.write_bytes(old)
 def test_kernels_must_come_from_the_frozen_sources(self):
  # ADR-108: the public kernel carries catalog-visitor (ADR-106 visitor identity), search and hot-search; the account kernel library/recommend-read.
  for folder,source,reason in [('public-kernel','catalog-visitor.c','Public kernel source inputs incomplete'),('account-read-kernel','library.c','Account kernel source inputs incomplete')]:
   manifest=ROOT/'build'/folder/'manifest.json';old=manifest.read_bytes()
   try:
    value=json.loads(old);value['sourceInputs']={k:v for k,v in value['sourceInputs'].items() if not k.endswith('/'+source)};manifest.write_text(json.dumps(value))
    result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True,timeout=45)
    self.assertNotEqual(result.returncode,0);self.assertIn(reason,result.stdout+result.stderr)
   finally:manifest.write_bytes(old)
if __name__=='__main__':unittest.main()
