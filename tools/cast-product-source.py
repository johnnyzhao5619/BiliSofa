"""Audited product extraction; legacy probes are immutable inputs, never overwritten."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parents[1]
NAMES=['probe-bridge.h','probe-cast.h','probe-cast-source.h']
# Exact reviewed source baseline, also recorded in the linked module manifest.
EXPECTED={
 'probe-bridge.h':'d162ea64a37b86762f3c876beb72b54cfe2ae492533bac399e2f132d17c2c399',
 'probe-cast.h':'e4fb2394fc64e2081c2c2caf22c106a6e315c7012834daa4a94cae82532e23a8',
 'probe-cast-source.h':'a9b5ea0974bf0abb765ae92eafbee5ffaaaf0c55e41a9c6d0280a857103f9901',
}
def generate(output):
 out=Path(output);out.mkdir(parents=True,exist_ok=True)
 for name in NAMES:
  p=ROOT/'platform/wasm-network/src'/name
  if hashlib.sha256(p.read_bytes()).hexdigest()!=EXPECTED[name]:raise ValueError('Cast product extraction drift: '+name)
  s=p.read_text()
  def replace(old,new,count=1):
   nonlocal s
   if s.count(old)!=count:raise ValueError('Cast product transformation drift: '+old[:70])
   s=s.replace(old,new)
  if name=='probe-bridge.h':
   replace('BILISOFA_PROBE_BRIDGE_H','BILISOFA_CAST_PRODUCT_BRIDGE_H',2)
   replace('#define BRIDGE_STREAM_BUDGET (128ULL*1024*1024)','#define BRIDGE_STREAM_BUDGET 18446744073709551615ULL')
   replace('    if(++bridge_windows>256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET){bridge_limit_note(bridge_windows>256?"windows":"bytes");bridge_error(c,429);return;}','    if(bridge_windows<1000000)bridge_windows++;')
   replace(' || bridge_retry_count>=3','');replace(' || bridge_windows>=256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET','')
   replace('  printf(resumable?"BRIDGE:resume:%u\\n":"BRIDGE:retry:%u\\n",++bridge_retry_count);fflush(stdout);return 1;','  if(bridge_retry_count<3){printf(resumable?"BRIDGE:resume:%u\\n":"BRIDGE:retry:%u\\n",++bridge_retry_count);fflush(stdout);}return 1;')
   replace('bridge_connections>=512 || ','');replace('else if(bridge_connections>=512)bridge_limit_note("connections");','');replace('bridge_connections++;','if(bridge_connections<1000000)bridge_connections++;')
   replace('bridge_deadline=http_now()+(remaining<300?remaining:300);','bridge_deadline=http_now()+remaining;')
   replace('BiliSofa-W01-Probe/0.0.29','BiliSofa/0.25.0')
   replace('/* Internal progressive-cast probe: five minutes including setup/pauses;\n     the signed destination deadline can only shorten the window. */','/* Foreground product: each source retains its real signed deadline. */')
   target='cast-product-bridge.h'
  elif name=='probe-cast.h':
   replace('BILISOFA_PROBE_CAST_H','BILISOFA_CAST_PRODUCT_H',2);replace('"probe-cast-source.h"','"cast-product-source.h"')
   replace('#define CAST_CONNECTION_LIMIT 1024','#define CAST_CONNECTION_LIMIT 2147483647')
   replace('cast_deadline=now+300;','cast_deadline=DBL_MAX;')
   # Bounded discovery replies per sliding second, rather than a lifetime cap.
   replace('static struct ip_mreq cast_group;','static struct ip_mreq cast_group;\nstatic double cast_reply_window;')
   replace('  cast_source_tick();','  if(now>=cast_reply_window+1){cast_reply_window=now;cast_replies=0;}\n  cast_source_tick();')
   replace('BiliSofa W01 Discovery','BiliSofa');replace('Discovery only; media control unavailable in this probe','Foreground official-App media receiver');replace('BiliSofa W01 Probe','BiliSofa TV')
   replace('BiliSofa/0.0.28 UPnP/1.0 DiscoveryProbe/1','BiliSofa/0.25.0 UPnP/1.0 TVReceiver/1',2)
   target='cast-product-receiver.h'
  else:
   replace('BILISOFA_PROBE_CAST_SOURCE_H','BILISOFA_CAST_PRODUCT_SOURCE_H',2)
   replace('cast_session_until=http_now()+300','cast_session_until=DBL_MAX')
   replace('generation>4','generation>2147483646')
   replace(' || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET || bridge_windows>=256 || bridge_connections>=512','')
   replace('  if(bridge_deadline<cast_session_until)cast_session_until=bridge_deadline;','  /* Each replacement is bound to its own new signed deadline. */')
   replace('  if(cast_transition_enabled){bridge_stream_bytes=cast_carry_bytes;bridge_windows=cast_carry_windows;bridge_connections=cast_carry_connections;bridge_retry_count=cast_carry_retries;}','  /* Per-media counters start fresh; no cumulative probe quota. */')
   replace('BiliSofa-W01-Probe/0.0.28','BiliSofa/0.25.0')
   replace('  /* The explicit TV action may extend this bounded probe by at most 5 minutes. */','  /* Discovery remains foreground-owned; media uses its signed deadline. */')
   replace('   Keeps the discovery listener/owner and all cumulative media budgets alive. */','   Keeps the foreground discovery listener and explicit sender owner. */')
   target='cast-product-source.h'
  (out/target).write_text('/* Generated product policy; tools/cast-product-source.py. */\n'+s)
if __name__=='__main__':
 import sys
 generate(sys.argv[1])
