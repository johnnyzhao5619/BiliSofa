"""W06 inherits prior whole-package gates and adds isolated product receiver checks."""
from pathlib import Path
import hashlib,importlib.util,json,subprocess,unittest
spec=importlib.util.spec_from_file_location('w05_gates',Path(__file__).with_name('w05-packaging.test.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
ROOT=module.ROOT;module.module.base.STAGE=ROOT/'dist/w06-app';module.module.base.PACKAGE=ROOT/'dist/BiliSofa-W06-cast-unsigned.wgt'
class W06Packaging(module.W05Packaging):
 def rejected(self,expected):
  before=hashlib.sha256(module.module.base.PACKAGE.read_bytes()).hexdigest();r=subprocess.run(['python3','tools/package-foundation-app.py','--w06'],cwd=ROOT,capture_output=True,text=True);self.assertNotEqual(r.returncode,0);self.assertIn(expected,r.stdout+r.stderr);self.assertEqual(hashlib.sha256(module.module.base.PACKAGE.read_bytes()).hexdigest(),before)
 def test_w04_cannot_be_relabeled_as_previous_version(self):
  path=module.module.base.STAGE/'config.xml';manifest=module.module.base.STAGE/'ui-manifest.json';old=path.read_bytes();saved=manifest.read_bytes()
  try:
   self.assertIn(b'0.25.0',old);path.write_bytes(old.replace(b'0.25.0',b'0.24.1'));ui=json.loads(saved);ui['files']['config.xml']=hashlib.sha256(path.read_bytes()).hexdigest();manifest.write_text(json.dumps(ui));self.rejected('Foundation identity mismatch')
  finally:path.write_bytes(old);manifest.write_bytes(saved)
 def test_cast_requires_same_ca_and_library(self):self.module('cast-product',None,'W04 native provenance mismatch',lambda m:m.update(caSha256='0'*64))
 def test_cast_probe_quotas_cannot_be_reintroduced(self):self.module('cast-product',None,'Cast product still has probe quotas',lambda m:m['policy'].update(cumulativeProbeQuotas=True))
 def test_cast_discovery_identity_cannot_regress_to_probe(self):self.module('cast-product',lambda b:b.replace(b'<friendlyName>BiliSofa</friendlyName>',b'<friendlyName>StaleName</friendlyName>'),'W04 native fixed route missing')
 def test_cast_lane_cannot_gain_account_or_comment_post(self):
  for route in [b'/history/report',b'/x/v2/reply/add',b'/x/web-interface/coin/add',b'/pgc/web/follow/add']:
   with self.subTest(route=route):self.module('cast-product',lambda b:b+route,'W04 native unrelated route')
if __name__=='__main__':unittest.main()
