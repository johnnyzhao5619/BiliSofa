"""U4 independent capability exact-image policy and package identity negative checks; no signing/device."""
from pathlib import Path
import hashlib,json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[2];STAGE=ROOT/'dist/product-cast-seek-app'
class ProductPackage(unittest.TestCase):
 def rejected(self,name,change,reason,rehash=True):
  manifest=STAGE/'ui-manifest.json';old_manifest=manifest.read_bytes();path=STAGE/name;old=path.read_bytes()
  try:
   path.write_bytes(change(old))
   if rehash:
    value=json.loads(old_manifest);value['files'][name]=hashlib.sha256(path.read_bytes()).hexdigest();manifest.write_text(json.dumps(value))
   result=subprocess.run(['python3','tools/package-foundation-app.py','--product-cast-seek'],cwd=ROOT,capture_output=True,text=True,timeout=45)
   self.assertNotEqual(result.returncode,0);self.assertIn(reason,result.stdout+result.stderr)
  finally:path.write_bytes(old);manifest.write_bytes(old_manifest)
 def test_csp_wildcard_is_rejected(self):self.rejected('index.html',lambda b:b.replace(b"connect-src 'self'",b"connect-src * 'self'"),'W04 CSP mismatch')
 def test_remote_script_is_rejected(self):self.rejected('index.html',lambda b:b.replace(b"script-src 'self'",b"script-src https: 'self'"),'W04 CSP mismatch')
 def test_unscoped_image_origin_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'https://i0.hdslb.com',b'https://outside.invalid'),'Foundation network privilege mismatch')
 def test_wrong_version_is_rejected(self):self.rejected('config.xml',lambda b:b.replace(b'0.42.0',b'0.41.0'),'Foundation identity mismatch')
 def test_credential_like_payload_is_rejected(self):self.rejected('app.js',lambda b:b+b'\n/* SESSDATA=synthetic */','Foundation private or unsafe payload')
 def test_file_mismatch_is_rejected(self):self.rejected('app.js',lambda b:b+b'\n','Foundation input digest mismatch',False)
if __name__=='__main__':unittest.main()
