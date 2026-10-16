"""Real host loopback binary transfer/bounds; synthetic bytes, not TV playback."""
from pathlib import Path
import socket, subprocess, tempfile, unittest
ROOT=Path(__file__).resolve().parents[2]
class MediaProbeTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(); self.folder=Path(self.tmp.name)
  with socket.socket() as reserve: reserve.bind(('127.0.0.1',0)); self.port=reserve.getsockname()[1]
  (self.folder/'probe.mpd').write_bytes(b'<MPD type="static"/>')
  (self.folder/'init-0.mp4').write_bytes(b'\0\0\0\x10ftyp\0synthetic')
  (self.folder/'init-1.mp4').write_bytes(b'\0\0\0\x10ftyp\0synthetic-audio')
  source=self.folder/'media.c';source.write_text('''#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include "probe-http.h"
#include "probe-media.h"
int main(void) { (void)http_probe; int result=media_probe(); printf("RESULT:%d\\n",result); return 0; }
''')
  exe=self.folder/'media'
  subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-Wall','-Wextra','-Werror',f'-DBILISOFA_MEDIA_PORT={self.port}','-DBILISOFA_MEDIA_SECONDS=3',f'-DBILISOFA_MEDIA_ROOT="{self.folder}"','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-o',str(exe)],check=True)
  self.process=subprocess.Popen([str(exe)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.assertEqual(self.process.stdout.readline().strip(),'MPD:ready')
 def tearDown(self):
  if self.process.poll() is None: self.process.terminate()
  self.process.communicate(timeout=5);self.tmp.cleanup()
 def exchange(self,line):
  with socket.create_connection(('127.0.0.1',self.port),timeout=4) as client:
   client.sendall(line+b'\r\nHost: synthetic.invalid\r\n\r\n'); result=b''
   while True:
    chunk=client.recv(4096)
    if not chunk: return result
    result+=chunk
 def test_repeated_mpd_and_binary_transfers_then_listener_deadline(self):
  for filename in ['probe.mpd','init-0.mp4','init-1.mp4','probe.mpd']:
   response=self.exchange(f'GET /{filename} HTTP/1.1'.encode())
   header,body=response.split(b'\r\n\r\n',1)
   self.assertTrue(header.startswith(b'HTTP/1.1 200'))
   self.assertEqual(body,(self.folder/filename).read_bytes())
   if filename=='init-1.mp4':self.assertIn(b'Content-Type: audio/mp4',header)
  self.assertIn('RESULT:2',self.process.communicate(timeout=5)[0])
  with self.assertRaises(OSError): socket.create_connection(('127.0.0.1',self.port),timeout=1)
 def test_fixed_whitelist_rejects_paths_query_proxy_post_head_has_no_body(self):
  for line in ['GET /../probe.mpd','GET /probe.mpd?url=other','POST /probe.mpd','GET /init-2.mp4','GET http://synthetic.invalid/probe.mpd']:
   response=self.exchange((line+' HTTP/1.1').encode());self.assertTrue(response.startswith(b'HTTP/1.1 404'))
  self.assertEqual(self.exchange(b'HEAD /probe.mpd HTTP/1.0').split(b'\r\n\r\n',1)[1],b'')
 def test_oversize_asset_rejected_without_breaking_next_request(self):
  (self.folder/'segment-0-00001.m4s').write_bytes(b'x'*(256*1024+1))
  self.assertEqual(self.exchange(b'GET /segment-0-00001.m4s HTTP/1.1'),b'')
  self.assertTrue(self.exchange(b'GET /probe.mpd HTTP/1.1').startswith(b'HTTP/1.1 200'))
if __name__=='__main__': unittest.main()
