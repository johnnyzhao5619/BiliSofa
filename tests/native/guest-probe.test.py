"""Host C memory/header/native argument bounds only. No outbound network requests."""
from pathlib import Path
import subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[2]
class GuestBoundsTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);source=folder/'guest.c';cls.binary=folder/'guest'
  source.write_text('''#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "probe-guest.h"
int main(int argc,char **argv) {
 (void)guest_video;
 if (argc==2 && !strcmp(argv[1],"limits")) {
  char bytes[2]={'x','y'};guest_reset();
  if(guest_limit!=131072 || guest_reject_reason()!=0)return 30;
  guest_size=guest_limit-1;
  if(guest_body(bytes,1,2,NULL)!=0 || guest_reject_reason()!=1 || guest_size!=131071)return 31;
  guest_reset();guest_limit=BILISOFA_GUEST_MAX;guest_size=guest_limit-1;
  if(guest_body(bytes,1,1,NULL)!=1 || guest_response_length()!=524288 || guest_body(bytes,1,1,NULL)!=0 || guest_reject_reason()!=1)return 32;
  guest_reset();char h[16384];memset(h,'x',sizeof(h));
  if(guest_header(h,1,sizeof(h),NULL)!=sizeof(h) || guest_header(bytes,1,1,NULL)!=0 || guest_reject_reason()!=2)return 33;
  guest_reset();char bad[]="Content-Range: bytes 1-512/123456\\r\\n";
  if(guest_header(bad,1,strlen(bad),NULL)!=0 || guest_reject_reason()!=3)return 34;
  guest_reset();return guest_reject_reason()==0 && guest_limit==131072 ? 0:35;
 }
 if (argc==2 && !strcmp(argv[1],"invalid")) { guest_popular("999/../../"); return guest_size==0 && guest_transport==2 && guest_status==0 ? 0:1; }
 if (argc==2 && !strcmp(argv[1],"policy")) {
  char url[256]; snprintf(url,sizeof(url),"https://test.bilivideo.com/synthetic.m4s?deadline=%llu",(unsigned long long)time(NULL)+3600);
  if (!guest_cdn_valid(url) || !guest_bvid_valid("BV0000000001") || !guest_cid_valid("9007199254740991")) return 10;
  const char *bad[]={"http://test.bilivideo.com/a.m4s?deadline=1700000000","https://test.bilivideo.com.evil.invalid/a.m4s?deadline=1700000000","https://user@test.bilivideo.com/a.m4s?deadline=1700000000","https://test.bilivideo.com:444/a.m4s?deadline=1700000000","https://-test.bilivideo.com/a.m4s?deadline=1700000000","https://test..bilivideo.com/a.m4s?deadline=1700000000"};
  for (size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++) if (guest_cdn_valid(bad[i])) return 11;
  if (guest_cid_valid("9007199254740992") || guest_cid_valid("001") || guest_bvid_valid("BV/../../bad")) return 12;
  guest_video("BV/../../bad",NULL,NULL); return guest_transport==2 && guest_size==0 ? 0:13;
 }
 if (argc==2 && !strcmp(argv[1],"range")) {
  guest_reset(); guest_status=206; guest_size=512; memcpy(guest_bytes+4,"ftyp",4);
  char h[]="content-range: bytes 0-511/123456\\r\\n";
  if (guest_header(h,1,strlen(h),NULL)!=strlen(h) || !guest_range_valid()) return 20;
  if (guest_header(h,1,strlen(h),NULL)!=0) return 21;
  guest_reset(); guest_status=200; guest_size=512; memcpy(guest_bytes+4,"ftyp",4);
  if (guest_header(h,1,strlen(h),NULL)!=strlen(h) || guest_range_valid()) return 22;
  guest_reset(); char bad[]="Content-Range: bytes 1-512/123456\\r\\n";
  if (guest_header(bad,1,strlen(bad),NULL)!=0) return 23;
  guest_reset(); guest_limit=512; guest_size=511;
  if (guest_body("xx",1,2,NULL)!=0 || guest_size!=511) return 24;
  return 0;
 }
 char bytes[4]={'a','b','c','d'};
 guest_size=BILISOFA_GUEST_MAX-2;
 if (guest_body(bytes,1,4,NULL)!=0 || guest_size!=BILISOFA_GUEST_MAX-2) return 1;
 if (guest_body(bytes,BILISOFA_GUEST_MAX+1,2,NULL)!=0) return 2;
 guest_size=0;
 if (guest_body(bytes,2,2,NULL)!=4 || guest_response_length()!=4 || memcmp(guest_bytes,bytes,4)) return 3;
 if (guest_response_ptr()!=(uintptr_t)guest_bytes) return 4;
 guest_header_size=16383;
 if (guest_header(bytes,1,2,NULL)!=0 || guest_header_size!=16383) return 5;
 guest_header_size=0;
 if (guest_header(bytes,1,4,NULL)!=4 || guest_header_size!=4) return 6;
 return 0;
}
''')
  subprocess.run(['clang','-std=c11','-Wall','-Wextra','-Werror','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-lcurl','-o',str(cls.binary)],check=True,capture_output=True)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def test_body_header_and_export_bounds(self):
  r=subprocess.run([str(self.binary)],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'')
 def test_invalid_native_page_never_enters_network(self):
  r=subprocess.run([str(self.binary),'invalid'],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'GUEST:closed\n')
 def test_cdn_and_identity_policy_before_network(self):
  r=subprocess.run([str(self.binary),'policy'],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'GUEST:closed\n')
 def test_range_response_requires_exact_status_range_length_and_file_header(self):
  r=subprocess.run([str(self.binary),'range'],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'')
 def test_separate_detail_body_budget_and_fixed_rejection_reasons(self):
  r=subprocess.run([str(self.binary),'limits'],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'')
if __name__=='__main__':unittest.main()
