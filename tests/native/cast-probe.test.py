"""Discovery-only HOST fixture: UDP/TCP loopback, no multicast or outside traffic."""
from pathlib import Path
import socket,subprocess,tempfile,time,unittest,urllib.request,urllib.error,xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[2]
TOKEN='0123456789abcdef0123456789abcdef'
UUID='01234567-89ab-4cde-8123-456789abcdef'
class CastTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);cls.exe=folder/'cast'
  with socket.socket() as s:s.bind(('127.0.0.1',0));cls.tcp=s.getsockname()[1]
  with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:s.bind(('127.0.0.1',0));cls.udp=s.getsockname()[1]
  source=folder/'cast.c';source.write_text('''#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <strings.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
static int inject=0,options=0,ttl_calls=0,join_calls=0;
static int test_setsockopt(int fd,int level,int name,const void *value,socklen_t size){
 if(!options)return setsockopt(fd,level,name,value,size);
 if(level!=IPPROTO_IP){errno=ENOPROTOOPT;return -1;}
 if(name==IP_MULTICAST_TTL){ttl_calls++;if(size!=1 || *(const unsigned char *)value!=1 || options==2){errno=EINVAL;return -1;}return 0;}
 if(name==IP_ADD_MEMBERSHIP){join_calls++;const struct ip_mreq *v=value;if(size!=sizeof(*v) || v->imr_multiaddr.s_addr!=inet_addr("239.255.255.250") || v->imr_interface.s_addr!=inet_addr("127.0.0.1") || options==3){errno=EINVAL;return -1;}return 0;}
 errno=ENOPROTOOPT;return -1;
}
#define setsockopt test_setsockopt
static int test_close(int fd){int n=close(fd);if(inject){errno=EIO;return -1;}return n;}
#define close test_close
#include "probe-http.h"
#include "probe-guest.h"
#include "probe-bridge.h"
#include "probe-cast.h"
int main(int argc,char **argv){
 (void)bridge_begin;(void)http_probe;(void)guest_video;(void)guest_popular;
 if(argc!=2)return 2;
 if(!strncmp(argv[1],"options",7)){options=!strcmp(argv[1],"options-ttl")?2:!strcmp(argv[1],"options-join")?3:1;struct in_addr address;address.s_addr=inet_addr("127.0.0.1");int rc=cast_multicast_begin(address);printf("OPTIONS:%d:%d:%d:%d\\n",rc,ttl_calls,join_calls,cast_joined);return 0;}
 if(!strcmp(argv[1],"invalid"))return cast_begin("8.8.8.8","01234567-89ab-4cde-8123-456789abcdef","0123456789abcdef0123456789abcdef")==16 && cast_tcp<0 && cast_udp<0?0:3;
 int rc=cast_begin("127.0.0.1","01234567-89ab-4cde-8123-456789abcdef","0123456789abcdef0123456789abcdef");
 if(!strcmp(argv[1],"conflict")){printf("FIXED_FAILURE:%d\\n",rc);return rc==12?0:5;}
 if(rc)return 3;
 if(!strcmp(argv[1],"rpc"))cast_rpc_enable();
 double start=http_now();while(http_now()-start<8 && cast_tcp>=0){cast_tick();struct pollfd in={0,POLLIN,0};if(poll(&in,1,0)>0 && (in.revents&POLLIN)){char c;read(0,&c,1);if(c=='p'){for(int i=0;i<2;i++)if(cast_clients[i].rpc_id){int id=cast_clients[i].rpc_id;int good=cast_rpc_peer(id)==0x7f000001 && cast_rpc_service(id)==3 && cast_rpc_body_size(id)==10 && !memcmp((void *)cast_rpc_body(id),"<fixture/>",10) && !strcmp((char *)cast_rpc_action(id),"\\\"urn:schemas-upnp-org:service:AVTransport:1#GetTransportInfo\\\"");int rejected=cast_rpc_reply(id,400,0)==-1 && cast_rpc_reply(id,200,6145)==-1;strcpy((char *)cast_rpc_buffer(),"<fixed/>");int sent=cast_rpc_reply(id,200,8);int stale=cast_rpc_reply(id,200,8)==0 && !cast_rpc_body(id) && !cast_rpc_action(id) && !cast_rpc_peer(id);printf("RPC_RESULT:%d:%d:%d:%d\\n",good,rejected,sent,stale);fflush(stdout);break;}continue;}if(c=='r'){cast_replies=64;continue;}if(c=='e')inject=1;break;}struct timespec d={0,2000000};nanosleep(&d,NULL);}
 if(cast_started)cast_stop();if(!strcmp(argv[1],"rpc")){printf("RPC_AFTER_STOP:%d\\n",cast_rpc_body(1)==0 && cast_rpc_action(1)==0 && cast_rpc_peer(1)==0);}puts("CLOSED_WHILE_PROCESS_ALIVE");fflush(stdout);struct timespec alive={1,0};nanosleep(&alive,NULL);return cast_unconfirmed?4:0;
}
''')
  subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-DBILISOFA_CAST_HOST_FIXTURE',f'-DBILISOFA_CAST_PORT={cls.tcp}',f'-DBILISOFA_CAST_SSDP_PORT={cls.udp}','-Wall','-Wextra','-Werror','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-lcurl','-o',str(cls.exe)],check=True,capture_output=True)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def setUp(self):
  self.process=subprocess.Popen([str(self.exe),'run'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);self.assertEqual(self.process.stdout.readline().strip(),'CAST:ready')
 def tearDown(self):
  if self.process.poll() is None:
   try:self.process.stdin.write('s');self.process.stdin.flush()
   except BrokenPipeError:pass
  self.process.communicate(timeout=5)
 def fetch(self,path='description.xml',method='GET',data=None):
  req=urllib.request.Request(f'http://127.0.0.1:{self.tcp}/{TOKEN}/{path}',method=method,data=data)
  with urllib.request.urlopen(req,timeout=2) as r:return r.status,r.headers,r.read()
 def raw(self,request):
  with socket.create_connection(('127.0.0.1',self.tcp),timeout=2) as s:
   s.sendall(request);out=b''
   while True:
    try:b=s.recv(8192)
    except ConnectionResetError:break
    if not b:break
    out+=b
   return out
 def search(self,st='urn:schemas-upnp-org:device:MediaRenderer:1',extra='',host='239.255.255.250:1900'):
  return f'M-SEARCH * HTTP/1.1\r\nHOST: {host}\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: {st}\r\n{extra}\r\n'.encode()
 def test_own_identity_and_fixed_relative_description_routes(self):
  status,headers,body=self.fetch();self.assertEqual(status,200);root=ET.fromstring(body);ns={'d':'urn:schemas-upnp-org:device-1-0'}
  self.assertEqual(root.find('.//d:friendlyName',ns).text,'BiliSofa W01 Discovery');self.assertEqual(root.find('.//d:UDN',ns).text,'uuid:'+UUID)
  self.assertEqual(len(root.findall('.//d:service',ns)),3)
  for node in root.findall('.//d:SCPDURL',ns):self.assertTrue(node.text.startswith('/'+TOKEN+'/'))
  self.assertNotIn(b'AppKey',body);self.assertNotIn(b'com.xiaodianshi',body);self.assertNotIn(b'Set-Cookie',str(headers).encode())
 def test_head_service_and_unsupported_control_do_not_execute_media_or_accounts(self):
  self.assertEqual(self.fetch(method='HEAD')[2],b'');self.assertEqual(self.fetch('AVTransport.xml')[0],200)
  with self.assertRaises(urllib.error.HTTPError) as e:self.fetch('control/AVTransport','POST',b'<not-executable>https://outside.invalid/</not-executable>')
  self.assertEqual(e.exception.code,500);self.assertIn(b'<errorCode>401</errorCode>',e.exception.read())
  self.assertIn(b'501',self.raw(b'SETUP /projection NVA/1.0\r\nContent-Length: 0\r\n\r\n').split(b'\r\n')[0])
 def test_protocol_query_is_fixed_read_only_and_unknown_or_duplicate_actions_are_rejected(self):
  _,_,scpd=self.fetch('ConnectionManager.xml');self.assertIn(b'<name>GetProtocolInfo</name>',scpd)
  base=f'POST /{TOKEN}/control/ConnectionManager HTTP/1.1\r\nContent-Length: 0\r\n'.encode()
  action=b'SOAPAction: "urn:schemas-upnp-org:service:ConnectionManager:1#GetProtocolInfo"\r\n'
  response=self.raw(base+action+b'\r\n');self.assertIn(b'200 OK',response.split(b'\r\n')[0])
  xml=ET.fromstring(response.split(b'\r\n\r\n',1)[1]);self.assertEqual(xml.find('.//Sink').text,'http-get:*:video/mp4:*');self.assertIsNone(xml.find('.//Source').text)
  self.assertNotIn(b'http://',response.split(b'\r\n\r\n',1)[0]);self.assertIn(b'400',self.raw(base+action+action+b'\r\n').split(b'\r\n')[0])
  for name in [b'PrepareForConnection',b'SetAVTransportURI']:
   response=self.raw(base+action.replace(b'GetProtocolInfo',name)+b'\r\n');self.assertIn(b'500',response.split(b'\r\n')[0]);self.assertIn(b'<errorCode>401</errorCode>',response)
  self.process.stdin.write('s');self.process.stdin.flush();out,_=self.process.communicate(timeout=3)
  final=next(line for line in out.splitlines() if line.startswith('CAST:closed:')).split(':')[2:]
  self.assertEqual(len(final),7);self.assertEqual(int(final[4]),2);self.assertEqual(int(final[6]),1)
 def test_wrong_token_query_method_and_body_smuggling_fail_closed(self):
  for path in ['../description.xml','description.xml?url=outside','unknown']:
   with self.assertRaises(urllib.error.HTTPError):self.fetch(path)
  base=f'POST /{TOKEN}/control/AVTransport HTTP/1.1\r\n'.encode()
  for header in [b'Content-Length: 1\r\nContent-Length: 1\r\n\r\nx',b'Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n',b'Content-Length: 0\r\n\r\nGET / HTTP/1.1\r\n\r\n']:
   self.assertIn(b'400',self.raw(base+header).split(b'\r\n')[0])
  self.assertIn(b'413',self.raw(base+b'Content-Length: 5000\r\n\r\n').split(b'\r\n')[0])
 def test_search_reply_goes_to_source_port_with_matching_st_and_udn(self):
  for host in ['239.255.255.250:1900','239.255.255.250']:
   with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:
    s.bind(('127.0.0.1',0));s.settimeout(2);s.sendto(self.search(host=host),('127.0.0.1',self.udp));reply,peer=s.recvfrom(2048)
    self.assertEqual(peer[1],self.udp);self.assertIn(b'ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n',reply);self.assertIn(('USN: uuid:'+UUID+'::').encode(),reply);self.assertIn(f'http://127.0.0.1:{self.tcp}/{TOKEN}/description.xml'.encode(),reply)
 def test_malformed_search_and_exhausted_response_budget_are_silent(self):
  with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:
   s.bind(('127.0.0.1',0));s.settimeout(.2)
   for packet in [self.search(extra='MX: 2\r\n'),self.search(st='urn:unknown:1'),self.search().replace(b'MX: 1',b'MX: 9'),self.search()+b'body',b'x'*2049]:
    s.sendto(packet,('127.0.0.1',self.udp))
    with self.assertRaises(socket.timeout):s.recvfrom(2048)
   self.process.stdin.write('r');self.process.stdin.flush();time.sleep(.02);s.sendto(self.search(),('127.0.0.1',self.udp));s.settimeout(1.1)
   with self.assertRaises(socket.timeout):s.recvfrom(2048)
 def test_partial_client_does_not_block_second_client_or_stop_cleanup(self):
  with socket.create_connection(('127.0.0.1',self.tcp),timeout=2) as c:
   c.sendall(b'GET /');self.assertEqual(self.fetch()[0],200);self.process.stdin.write('s');self.process.stdin.flush()
   lines=[]
   while True:
    line=self.process.stdout.readline().strip();lines.append(line)
    if line=='CLOSED_WHILE_PROCESS_ALIVE':break
   self.assertTrue(any(line.startswith('CAST:closed:') for line in lines));self.assertIsNone(self.process.poll());self.assertEqual(c.recv(32),b'')
   with self.assertRaises(OSError):socket.create_connection(('127.0.0.1',self.tcp),timeout=.2)
 def test_bind_failure_cannot_emit_a_false_successful_closed_event(self):
  r=subprocess.run([str(self.exe),'conflict'],capture_output=True,timeout=3);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'FIXED_FAILURE:12\n')
 def test_close_error_does_not_acknowledge_cleanup(self):
  self.process.stdin.write('e');self.process.stdin.flush();self.assertEqual(self.process.stdout.readline().strip(),'CAST:failed:17');self.assertEqual(self.process.stdout.readline().strip(),'CLOSED_WHILE_PROCESS_ALIVE');self.process.communicate(timeout=3);self.assertEqual(self.process.returncode,4)
 def test_sdk_options_preserve_one_byte_ttl_and_selected_membership_without_unsupported_interface_option(self):
  for mode,expected in [('options','OPTIONS:0:1:1:1'),('options-ttl','OPTIONS:131:1:0:0'),('options-join','OPTIONS:132:1:1:0')]:
   r=subprocess.run([str(self.exe),mode],capture_output=True,timeout=3);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout.decode().strip(),expected)
 def rpc_process(self):
  self.process.stdin.write('s');self.process.stdin.flush();self.process.communicate(timeout=3)
  self.process=subprocess.Popen([str(self.exe),'rpc'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);self.assertEqual(self.process.stdout.readline().strip(),'CAST:ready')
 def rpc_request(self):
  return (f'POST /{TOKEN}/control/AVTransport HTTP/1.1\r\nSOAPAction: "urn:schemas-upnp-org:service:AVTransport:1#GetTransportInfo"\r\nContent-Length: 10\r\n\r\n<fixture/>').encode()
 def test_rpc_getters_are_private_owned_and_reply_rejects_bad_status_and_stale_ids(self):
  self.rpc_process()
  with ThreadPoolExecutor() as pool:
   result=pool.submit(self.raw,self.rpc_request());self.assertEqual(self.process.stdout.readline().strip(),'CAST:rpc:1');self.process.stdin.write('p');self.process.stdin.flush();self.assertEqual(self.process.stdout.readline().strip(),'RPC_RESULT:1:1:1:1');response=result.result(timeout=2)
   self.assertIn(b'200 OK',response);self.assertTrue(response.endswith(b'<fixed/>'));self.assertNotIn(b'fixture',response)
 def test_rpc_ids_remain_unique_when_two_clients_complete_in_reverse_order(self):
  self.rpc_process();request=self.rpc_request()
  with socket.create_connection(('127.0.0.1',self.tcp),timeout=2) as first,socket.create_connection(('127.0.0.1',self.tcp),timeout=2) as second:
   first.sendall(request[:8]);time.sleep(.03);second.sendall(request);line1=self.process.stdout.readline().strip();first.sendall(request[8:]);line2=self.process.stdout.readline().strip()
   self.assertEqual({line1,line2},{'CAST:rpc:1','CAST:rpc:2'})
   for client in [first,second]:
    self.process.stdin.write('p');self.process.stdin.flush();self.assertEqual(self.process.stdout.readline().strip(),'RPC_RESULT:1:1:1:1');self.assertIn(b'200 OK',client.recv(4096))
 def test_rpc_pending_request_is_closed_and_getters_invalidated_on_stop(self):
  self.rpc_process()
  with ThreadPoolExecutor() as pool:
   result=pool.submit(self.raw,self.rpc_request());self.assertEqual(self.process.stdout.readline().strip(),'CAST:rpc:1');self.process.stdin.write('s');self.process.stdin.flush();out,_=self.process.communicate(timeout=3);self.assertIn('RPC_AFTER_STOP:1',out);self.assertIn('CAST:closed:',out);self.assertEqual(result.result(timeout=2),b'')
 def test_external_address_rejected_before_any_listener_is_created(self):
  r=subprocess.run([str(self.exe),'invalid'],capture_output=True,timeout=3);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'')
if __name__=='__main__':unittest.main()
