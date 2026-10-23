"""Negative package gates on generated stage only; restore bytes after each case.
Requires build:app + local verified identity/media artifacts. Never signs/installs.
"""
from pathlib import Path
import hashlib,json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'dist/foundation-app'
PACKAGE=ROOT/'dist/BiliSofa-W03-account-details-unsigned.wgt'
def sha(data):return hashlib.sha256(data).hexdigest()
class FoundationPackaging(unittest.TestCase):
 def rejected(self,expected):
  before=sha(PACKAGE.read_bytes())
  result=subprocess.run(['python3','tools/package-foundation-app.py'],cwd=ROOT,capture_output=True,text=True)
  self.assertNotEqual(result.returncode,0);self.assertIn(expected,result.stdout+result.stderr)
  self.assertEqual(sha(PACKAGE.read_bytes()),before)
 def test_extra_stage_script_rejected(self):
  path=STAGE/'unexpected.js';self.assertFalse(path.exists())
  try:path.write_text('/* synthetic extra entry */');self.rejected('Unexpected foundation stage file')
  finally:path.unlink(missing_ok=True)
 def test_extra_privilege_rejected_even_with_rehashed_stage(self):
  config=STAGE/'config.xml';manifest=STAGE/'ui-manifest.json';original=config.read_bytes();saved=manifest.read_bytes()
  try:
   config.write_bytes(original.replace(b'</widget>',b'<tizen:privilege name="http://tizen.org/privilege/mediastorage"/></widget>'))
   ui=json.loads(saved);ui['files']['config.xml']=sha(config.read_bytes());manifest.write_text(json.dumps(ui))
   self.rejected('Foundation network privilege mismatch')
  finally:config.write_bytes(original);manifest.write_bytes(saved)
 def test_extra_loopback_origin_rejected_even_with_rehashed_stage(self):
  config=STAGE/'config.xml';manifest=STAGE/'ui-manifest.json';original=config.read_bytes();saved=manifest.read_bytes()
  try:
   config.write_bytes(original.replace(b'</widget>',b'<access origin="http://127.0.0.1:40325" subdomains="false"/></widget>'))
   ui=json.loads(saved);ui['files']['config.xml']=sha(config.read_bytes());manifest.write_text(json.dumps(ui))
   self.rejected('Foundation network privilege mismatch')
  finally:config.write_bytes(original);manifest.write_bytes(saved)
 def test_library_ca_must_match_verified_identity(self):
  path=ROOT/'build/library/manifest.json';saved=path.read_bytes()
  try:
   value=json.loads(saved);value['caSha256']='0'*64;path.write_text(json.dumps(value));self.rejected('Library provenance mismatch')
  finally:path.write_bytes(saved)
 def test_library_endpoint_cannot_be_replaced_by_rehashed_native(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/v2/medialist/toview/web?';self.assertIn(marker,original);wasm.write_bytes(original.replace(marker,b'/x/v2/medialist/toview/bad?'));value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library fixed route missing')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_library_cannot_include_mutation_route_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   wasm.write_bytes(original+b'/x/v2/history/toview/del');value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library unrelated route')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_history_fixed_endpoint_is_required_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/web-interface/history/cursor?max=%s&view_at=%s&business=%s';self.assertIn(marker,original);wasm.write_bytes(original.replace(marker,marker.replace(b'/cursor?',b'/cursar?')));value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library fixed route missing')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_history_write_routes_remain_forbidden_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   wasm.write_bytes(original+b'/x/web-interface/history/clear');value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library unrelated route')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_favorite_collection_type_and_route_cannot_be_replaced_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/v2/medialist/resource/list?mobi_app=web&type=3&biz_id=%s';self.assertIn(marker,original);wasm.write_bytes(original.replace(marker,marker.replace(b'type=3',b'type=1')));value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library fixed route missing')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_favorite_write_route_forbidden_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   wasm.write_bytes(original+b'/x/v3/fav/resource/deal');value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library unrelated route')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_follow_route_cannot_be_replaced_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/polymer/web-dynamic/v1/feed/nav?';self.assertIn(marker,original);wasm.write_bytes(original.replace(marker,marker.replace(b'/feed/nav?',b'/feed/bad?')));value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library fixed route missing')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_follow_write_route_forbidden_even_rehashed(self):
  path=ROOT/'build/library/manifest.json';wasm=ROOT/'build/library/probe.wasm';saved=path.read_bytes();original=wasm.read_bytes()
  try:
   wasm.write_bytes(original+b'/x/dynamic/create');value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());path.write_text(json.dumps(value));self.rejected('Library unrelated route')
  finally:wasm.write_bytes(original);path.write_bytes(saved)
 def test_catalog_ca_must_match_existing_verified_runtime(self):
  manifest=ROOT/'build/catalog/manifest.json';saved=manifest.read_bytes()
  try:
   value=json.loads(saved);value['caSha256']='0'*64;manifest.write_text(json.dumps(value));self.rejected('Catalog provenance mismatch')
  finally:manifest.write_bytes(saved)
 def test_catalog_fixed_route_cannot_be_replaced_by_rehashing_native_manifest(self):
  manifest=ROOT/'build/catalog/manifest.json';wasm=ROOT/'build/catalog/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/web-interface/ranking/v2?rid=0&type=all';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,b'/x/web-interface/ranking/v2?rid=1&type=all'))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Catalog fixed route missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_catalog_category_endpoint_cannot_be_replaced_by_rehashed_native(self):
  manifest=ROOT/'build/catalog/manifest.json';wasm=ROOT/'build/catalog/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'/x/web-interface/ranking/v2?rid=%d&type=all';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,b'/x/web-interface/ranking/v2?bid=%d&type=all'))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Catalog category route missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_stale_generated_categories_rejected_before_packaging(self):
  path=ROOT/'packages/contracts/src/category-data.ts';saved=path.read_bytes()
  try:path.write_bytes(saved+b'// synthetic stale data\n');self.rejected('Stale generated category facts')
  finally:path.write_bytes(saved)
 def test_search_dictionary_notice_cannot_be_replaced_with_rehashed_ui_manifest(self):
  notice=STAGE/'search-NOTICE';manifest=STAGE/'ui-manifest.json';original=notice.read_bytes();saved=manifest.read_bytes()
  try:
   notice.write_bytes(b'Synthetic missing upstream notice');value=json.loads(saved);value['files']['search-NOTICE']=sha(notice.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search dictionary/license mismatch')
  finally:notice.write_bytes(original);manifest.write_bytes(saved)
 def test_search_fixed_endpoint_cannot_be_replaced_by_rehashing_native_manifest(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'https://api.bilibili.com/x/web-interface/wbi/search/type?%s&w_rid=%s';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,marker.replace(b'/wbi/search/type',b'/wbi/search/other')))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search fixed route missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_hot_search_ca_must_match_existing_verified_runtime(self):
  manifest=ROOT/'build/hot-search/manifest.json';saved=manifest.read_bytes()
  try:
   value=json.loads(saved);value['caSha256']='0'*64;manifest.write_text(json.dumps(value));self.rejected('Hot search provenance mismatch')
  finally:manifest.write_bytes(saved)
 def test_search_public_nav_cannot_be_replaced_by_rehashed_native(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'https://api.bilibili.com/x/web-interface/nav';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,marker.replace(b'/nav',b'/bad')))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search fixed route missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_search_unsigned_fallback_is_forbidden_even_with_rehashed_native(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   wasm.write_bytes(original+b'https://api.bilibili.com/x/web-interface/search/type?')
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search unsigned fallback forbidden')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_user_search_fixed_type_cannot_be_replaced_by_rehashed_native(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'search_type=bili_user';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,b'search_type=bad_users'))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search fixed query missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_pgc_search_fixed_type_cannot_be_replaced_by_rehashed_native(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'search_type=media_bangumi';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,b'search_type=media_invalid'))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search fixed query missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_live_search_fixed_type_cannot_be_replaced_by_rehashed_native(self):
  manifest=ROOT/'build/search/manifest.json';wasm=ROOT/'build/search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'search_type=live_room';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,b'search_type=bad_rooms'))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Search fixed query missing')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
 def test_hot_search_fixed_endpoint_cannot_be_replaced_by_rehashing_native_manifest(self):
  manifest=ROOT/'build/hot-search/manifest.json';wasm=ROOT/'build/hot-search/probe.wasm';saved=manifest.read_bytes();original=wasm.read_bytes()
  try:
   marker=b'https://s.search.bilibili.com/main/hotword';self.assertIn(marker,original)
   wasm.write_bytes(original.replace(marker,marker.replace(b'/main/hotword',b'/main/suggest')))
   value=json.loads(saved);value['files']['probe.wasm']=sha(wasm.read_bytes());manifest.write_text(json.dumps(value));self.rejected('Hot search unrelated route')
  finally:wasm.write_bytes(original);manifest.write_bytes(saved)
if __name__=='__main__':unittest.main()
