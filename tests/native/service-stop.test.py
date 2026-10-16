"""Cooperative fd closure before Worker/process exit, with real host sockets."""
from pathlib import Path
import socket,subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[2]
class ServiceStopTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.folder=Path(self.tmp.name)
  with socket.socket() as reserve: reserve.bind(('127.0.0.1',0));self.port=reserve.getsockname()[1]
  (self.folder/'probe.mpd').write_bytes(b'<MPD/>')
  code='''#define _GNU_SOURCE
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
#include "probe-service.h"
int main(int argc,char **argv) {
 (void)argc; (void)http_probe; (void)media_probe;
 int kind=atoi(argv[1]);
 for (int repeat=0;repeat<2;repeat++) {
  if(service_begin(kind,"{\\"schema\\":1}")) return 3;
  double start=http_now();
  while(service_fd>=0 && http_now()-start<0.7) { service_tick(); struct timespec delay={0,5000000};nanosleep(&delay,NULL); }
  probe_stop();
  puts("CLOSED_WHILE_PROCESS_ALIVE");fflush(stdout);
  struct timespec alive={1,0};nanosleep(&alive,NULL);
 }
 return 0;
}
'''
  source=self.folder/'service.c';source.write_text(code);self.exe=self.folder/'service'
  self.compile_command=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-Wall','-Wextra','-Werror',f'-DBILISOFA_HTTP_PORT={self.port}',f'-DBILISOFA_MEDIA_PORT={self.port}',f'-DBILISOFA_MEDIA_ROOT="{self.folder}"','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-o',str(self.exe)]
  subprocess.run(self.compile_command,check=True)
  self.process=None
 def tearDown(self):
  if self.process and self.process.poll() is None:self.process.terminate()
  if self.process:self.process.communicate(timeout=5)
  self.tmp.cleanup()
 def start(self,kind):
  self.process=subprocess.Popen([str(self.exe),str(kind)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.assertIn('ready',self.process.stdout.readline())
 def assert_closed_and_running(self):
  for line in self.process.stdout:
   if 'CLOSED_WHILE_PROCESS_ALIVE' in line:break
  self.assertIsNone(self.process.poll())
  with self.assertRaises(OSError):socket.create_connection(('127.0.0.1',self.port),timeout=0.2)
  self.assertIn('ready',self.process.stdout.readline()) # same port rebind inside same process
 def test_mpd_stop_closes_fd_before_process_exit_and_rebinds(self):
  self.start(2);self.assert_closed_and_running()
 def test_http_get_then_stop_closes_and_rebinds(self):
  self.start(1)
  with socket.create_connection(('127.0.0.1',self.port),timeout=3) as client:
   client.sendall(b'GET /report HTTP/1.1\r\n\r\n');response=b''
   while True:
    data=client.recv(4096)
    if not data:break
    response+=data
  self.assertTrue(response.endswith(b'{"schema":1}'))
  self.assert_closed_and_running()
 def test_close_error_never_emits_stop_ack_and_blocks_same_process_reuse(self):
  source=self.folder/'service.c';code=source.read_text().replace('#include "probe-http.h"', '\nstatic int injected_close(int fd) { close(fd); errno=EIO; return -1; }\n#define close injected_close\n#include "probe-http.h"')
  source.write_text(code);subprocess.run(self.compile_command,check=True)
  self.start(2);output=self.process.communicate(timeout=5)[0]
  self.assertIn('MPD:failed:17',output)
  self.assertNotIn('MPD:stopped',output)
  self.assertEqual(self.process.returncode,3)
 def test_client_close_error_does_not_turn_successful_body_into_cleanup_ack(self):
  source=self.folder/'service.c';code=source.read_text().replace('#include "probe-http.h"', '\nstatic int injected_close(int fd) { struct sockaddr_in peer; socklen_t size=sizeof(peer); int client=getpeername(fd,(struct sockaddr *)&peer,&size)==0; int rc=close(fd); if(client) { errno=EIO; return -1; } return rc; }\n#define close injected_close\n#include "probe-http.h"')
  source.write_text(code);subprocess.run(self.compile_command,check=True)
  self.start(1)
  with socket.create_connection(('127.0.0.1',self.port),timeout=3) as client:
   client.sendall(b'GET /report HTTP/1.1\r\n\r\n')
   while client.recv(4096):pass
  output=self.process.communicate(timeout=5)[0]
  self.assertIn('HTTP:failed:17',output)
  self.assertNotIn('HTTP:stopped',output)
  self.assertNotIn('HTTP:served',output)
  self.assertEqual(self.process.returncode,3)
if __name__=='__main__':unittest.main()
