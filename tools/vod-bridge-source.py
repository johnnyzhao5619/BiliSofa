"""Derive production DASH bridge from the frozen, tested original I/O core.

Explicit checked transformations avoid diverging copies of socket/backpressure
code. Legacy probe source/artifacts remain unchanged. Generated source is local
build output; its recipe, policy and base hashes are all compilation inputs.
"""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'platform/wasm-network/src/probe-bridge.h'
BASE_HASH = '3eef5c56bd48a7a216cf8eede2abc1249de3881065545573a64ffacc39cb0b7f'


def generate(output):
    if hashlib.sha256(BASE.read_bytes()).hexdigest() != BASE_HASH:
        raise ValueError('Production bridge base changed; review recipe and affected I/O tests')
    source = BASE.read_text()

    def replace(old, new, count=1):
        nonlocal source
        if source.count(old) != count:
            raise ValueError('Production bridge transformation drift')
        source = source.replace(old, new)

    def function(name, next_marker, body):
        nonlocal source
        start = source.index('static ' + name)
        end = source.index(next_marker, start)
        source = source[:start] + body + '\n' + source[end:]

    replace('BILISOFA_PROBE_BRIDGE_H', 'BILISOFA_PRODUCTION_DASH_BRIDGE_H', 2)
    replace('#define BRIDGE_STREAM_BUDGET (128ULL*1024*1024)', '#define BRIDGE_STREAM_BUDGET 18446744073709551615ULL')
    function('int bridge_manifest(', '/* Internal probe budget:', '#include "vod-bridge-policy.h"\nstatic int bridge_manifest(const char *metadata) { return vod_manifest(metadata); }')
    function('double bridge_probe_lease(', 'static size_t bridge_body(', 'static double bridge_probe_lease(unsigned int ms, double video, double audio) { return vod_lease(ms, video, audio); }')
    replace('  if(c->streaming && n>BRIDGE_STREAM_BUDGET-bridge_stream_bytes){bridge_limit_note("bytes");bridge_flow_snapshot(\'e\');return 0;}\n', '')
    replace('    if(++bridge_windows>256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET){bridge_limit_note(bridge_windows>256?"windows":"bytes");bridge_error(c,429);return;}\n', '    if (bridge_windows < 1000000) bridge_windows++;\n')
    replace(' || bridge_windows>=256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET', '')
    replace(' || bridge_retry_count>=3', '')
    replace('  printf(resumable?"BRIDGE:resume:%u\\n":"BRIDGE:retry:%u\\n",++bridge_retry_count);fflush(stdout);return 1;', '  if (bridge_retry_count < 3) { printf(resumable?"BRIDGE:resume:%u\\n":"BRIDGE:retry:%u\\n",++bridge_retry_count);fflush(stdout); } return 1;')
    replace('bridge_connections>=512 || ', '')
    replace('else if(bridge_connections>=512)bridge_limit_note("connections");', '')
    replace('bridge_connections++;', 'if (bridge_connections < 1000000) bridge_connections++;')
    replace('"BiliSofa-W01-Probe/0.0.29"', '"BiliSofa/0.0.0"')
    replace('total!=bridge_progressive_total', 'total!=vod_totals[c->kind-1]')
    old = 'else if(c->streaming) written=snprintf(c->header,sizeof(c->header),"HTTP/1.1 206 Partial Content\\r\\nContent-Type: video/mp4\\r\\nContent-Length: %llu\\r\\nContent-Range: bytes %llu-%llu/%llu\\r\\nAccept-Ranges: bytes\\r\\nCache-Control: no-store\\r\\nConnection: close\\r\\n\\r\\n",c->response_length,c->response_start,c->response_end,bridge_progressive_total);'
    new = old.replace('Content-Type: video/mp4', 'Content-Type: %s').replace('c->response_length,', 'mime,c->response_length,').replace('bridge_progressive_total);', 'vod_totals[c->kind-1]);')
    replace(old, new)
    replace('bridge_range(value,&c->start,&c->end)', 'vod_range(value,&c->start,&c->end,c->kind-1)')
    replace('  else if (!c->head && !ranged) { bridge_error(c,400); return; }', '  else if (!vod_request_media(c,ranged)) { bridge_error(c,400); return; }\n  else if (c->head) return;')
    # Progressive MP4 is a distinct casting path, never an entry in this module.
    source = '/* Generated production DASH policy; see tools/vod-bridge-source.py. */\n' + source
    source = source.replace('/* Internal probe budget: duration + setup/pause allowance, at most 15 minutes.\n   The two signed destinations can only shorten this lease. Not URL renewal. */', '/* Production lease is bounded by both signatures, with owned renewal. */')
    for forbidden in ['bridge_connections>=512', 'bridge_windows>=256', 'lease>900', 'n>BRIDGE_STREAM_BUDGET-bridge_stream_bytes']:
        if forbidden in source:
            raise ValueError('Probe quota remains in production bridge')
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(source)
    return hashlib.sha256(source.encode()).hexdigest()


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python3 tools/vod-bridge-source.py OUTPUT_HEADER')
    print(generate(sys.argv[1]))
