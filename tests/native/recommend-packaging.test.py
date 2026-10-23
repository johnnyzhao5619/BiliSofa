"""Current recommendation assembly inherits product gates; mutations always restored."""
from pathlib import Path
import hashlib,importlib.util,json,subprocess,unittest
spec=importlib.util.spec_from_file_location('w06_gates',Path(__file__).with_name('w06-packaging.test.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
ROOT=module.ROOT;legacy=module.module.module.base;legacy.STAGE=ROOT/'dist/recommend-app';legacy.PACKAGE=ROOT/'dist/BiliSofa-W03-recommend-unsigned.wgt'
class RecommendationPackaging(module.W06Packaging):
 def rejected(self,expected):
  before=hashlib.sha256(legacy.PACKAGE.read_bytes()).hexdigest();r=subprocess.run(['python3','tools/package-foundation-app.py','--recommend'],cwd=ROOT,capture_output=True,text=True);self.assertNotEqual(r.returncode,0);self.assertIn(expected,r.stdout+r.stderr);self.assertEqual(hashlib.sha256(legacy.PACKAGE.read_bytes()).hexdigest(),before)
 def test_w04_cannot_be_relabeled_as_previous_version(self):
  path=legacy.STAGE/'config.xml';manifest=legacy.STAGE/'ui-manifest.json';old=path.read_bytes();saved=manifest.read_bytes()
  try:
   self.assertIn(b'0.28.0',old);path.write_bytes(old.replace(b'0.28.0',b'0.25.0'));ui=json.loads(saved);ui['files']['config.xml']=hashlib.sha256(path.read_bytes()).hexdigest();manifest.write_text(json.dumps(ui));self.rejected('Foundation identity mismatch')
  finally:path.write_bytes(old);manifest.write_bytes(saved)
 def test_recommendation_requires_exact_ca(self):self.module('recommend',None,'W04 native provenance mismatch',lambda m:m.update(caSha256='0'*64))
 def test_recommendation_requires_current_signed_feed_route(self):self.module('recommend',lambda b:b.replace(b'/x/web-interface/wbi/index/top/feed/rcmd?',b'/x/web-interface/bad/index/top/feed/rcmd?'),'W04 native fixed route missing')
 def test_recommendation_cannot_add_account_or_comment_writes(self):
  for route in [b'/history/report',b'/toview/add',b'/x/web-interface/coin/add',b'/x/v2/reply/add',b'/pgc/web/follow/add']:
   with self.subTest(route=route):self.module('recommend',lambda b:b+route,'W04 native unrelated route')
if __name__=='__main__':unittest.main()
