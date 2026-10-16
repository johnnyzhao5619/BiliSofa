"""Host socket behavior only; Samsung/Tizen inbound behavior requires device evidence."""
from pathlib import Path
import json, socket, subprocess, tempfile, unittest
ROOT = Path(__file__).resolve().parents[2]
class HttpProbeTest(unittest.TestCase):
 tizen_contract = False
 def setUp(self):
  self.tmp = tempfile.TemporaryDirectory()
  with socket.socket() as reserve:
   reserve.bind(('127.0.0.1',0)); self.port = reserve.getsockname()[1]
  source = Path(self.tmp.name)/'http.c'
  body = '''#define _GNU_SOURCE
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
int main(void) { int rc=http_probe("{\\"schema\\":1}"); printf("RESULT:%d\\n",rc); return 0; }
'''
  if self.tizen_contract:
   body = body.replace('#include "probe-http.h"', '''
#define __EMSCRIPTEN__ 1
#ifndef SOCK_NONBLOCK
#define SOCK_NONBLOCK 0x100000
#endif
static int contract_socket(int domain, int type, int protocol) {
 if (!(type & SOCK_NONBLOCK)) exit(86);
 int fd=socket(domain,type & ~SOCK_NONBLOCK,protocol);
 if (fd>=0 && fcntl(fd,F_SETFL,O_NONBLOCK)<0) abort();
 return fd;
}
static int contract_accept4(int fd, struct sockaddr *addr, socklen_t *len, int flags) {
 if (flags != SOCK_NONBLOCK) exit(87);
 int client=accept(fd,addr,len);
 if (client>=0 && fcntl(client,F_SETFL,O_NONBLOCK)<0) abort();
 return client;
}
#define socket contract_socket
#define accept4 contract_accept4
#define fcntl(...) (abort(), -1)
#include "probe-http.h"
''')
  source.write_text(body)
  self.exe = Path(self.tmp.name)/'http'
  subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-Wall','-Wextra','-Werror',f'-DBILISOFA_HTTP_PORT={self.port}','-DBILISOFA_HTTP_SECONDS=3','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-o',str(self.exe)],check=True)
  self.process = subprocess.Popen([str(self.exe)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.assertEqual(self.process.stdout.readline().strip(),'HTTP:ready')
 def tearDown(self):
  if self.process.poll() is None: self.process.terminate()
  self.process.communicate(timeout=5); self.tmp.cleanup()
 def exchange(self,request):
  with socket.create_connection(('127.0.0.1',self.port),timeout=4) as client:
   client.sendall(request); result=b''
   while True:
    chunk=client.recv(4096)
    if not chunk: return result
    result+=chunk
 def test_exact_get_transfers_report_then_closes_listener(self):
  response=self.exchange(b'GET /report HTTP/1.1\r\nHost: synthetic.invalid\r\n\r\n')
  header,body=response.split(b'\r\n\r\n',1)
  self.assertTrue(header.startswith(b'HTTP/1.1 200'))
  self.assertIn(b'Cache-Control: no-store',header)
  self.assertEqual(json.loads(body),{'schema':1})
  self.assertEqual(self.process.communicate(timeout=4)[0].strip(),'RESULT:0')
  with self.assertRaises(OSError): socket.create_connection(('127.0.0.1',self.port),timeout=1)
 def test_rejects_methods_urls_and_head_does_not_count_as_transfer(self):
  for line in [b'POST /report',b'GET /report?url=https://synthetic.invalid',b'GET http://synthetic.invalid/report',b'GET /../secret']:
   response=self.exchange(line+b' HTTP/1.1\r\n\r\n')
   self.assertTrue(response.startswith(b'HTTP/1.1 404'))
   self.assertNotIn(b'"schema"',response)
  response=self.exchange(b'HEAD /report HTTP/1.0\r\n\r\n')
  self.assertEqual(response.split(b'\r\n\r\n',1)[1],b'')
  self.assertEqual(self.process.communicate(timeout=5)[0].strip(),'RESULT:2')
 def test_slow_client_bounded_and_oversize_rejected_then_deadline_closes(self):
  with socket.create_connection(('127.0.0.1',self.port),timeout=4) as client:
   client.sendall(b'GET /report HTTP/1.1\r\n'); self.assertEqual(client.recv(1024),b'')
  try: self.assertEqual(self.exchange(b'X'*2048),b'')
  except ConnectionResetError: pass
  self.assertEqual(self.process.communicate(timeout=5)[0].strip(),'RESULT:2')
class HttpTizenContractTest(HttpProbeTest):
 # Real host sockets + the SDK's forbidden F_SETFL and mandatory creation flags.
 # This is a compatibility regression harness, not real TV runtime evidence.
 tizen_contract = True
if __name__ == '__main__': unittest.main()
