"""Derive the ADR-101 failover bridge from the production DASH bridge source.

The production recipe (tools/vod-bridge-source.py), its frozen base and the
existing build/vod module stay unchanged; this adds explicit checked
transformations only. Generated source is local build output.
"""
from pathlib import Path
import hashlib
import runpy
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'tools/vod-bridge-source.py'
RECIPE_HASH = '6d451471f392bc67f469a27329711769934540728f0ae85356abc4f196649bd2'


def generate(output):
    if hashlib.sha256(RECIPE.read_bytes()).hexdigest() != RECIPE_HASH:
        raise ValueError('Production bridge recipe changed; review the failover transformations')
    with tempfile.TemporaryDirectory() as folder:
        base = Path(folder) / 'production.h'
        runpy.run_path(str(RECIPE))['generate'](base)
        source = base.read_text()

    def replace(old, new, count=1):
        nonlocal source
        if source.count(old) != count:
            raise ValueError('Failover bridge transformation drift')
        source = source.replace(old, new)

    replace('BILISOFA_PRODUCTION_DASH_BRIDGE_H', 'BILISOFA_FAILOVER_DASH_BRIDGE_H', 2)
    clients = 'static struct bridge_client bridge_clients[BRIDGE_CLIENTS] = { {.fd=-1}, {.fd=-1}, {.fd=-1}, {.fd=-1} };'
    replace(clients, clients + '\n/* ADR-101: one Bilibili backup per track; which host each client transfer uses. */\n'
        '#define VOD_FAILOVER_EARLY 9\nstatic char vod_alternates[2][2049];\nstatic int vod_on_alternate[2], vod_client_alternate[BRIDGE_CLIENTS];\n'
        'static int vod_failover(struct bridge_client *c, double now);\nstatic const char *vod_transfer_url(struct bridge_client *c);')
    replace('  memset(bridge_urls, 0, sizeof(bridge_urls));', '  memset(bridge_urls, 0, sizeof(bridge_urls)); memset(vod_alternates, 0, sizeof(vod_alternates)); memset(vod_on_alternate, 0, sizeof(vod_on_alternate));')
    replace('BRIDGE_SET(CURLOPT_URL,bridge_urls[c->kind-1]);', 'BRIDGE_SET(CURLOPT_URL,vod_transfer_url(c));')
    # A failed or timed-out range moves to the backup before any same-host retry.
    replace('{ if(bridge_retry_range(c,(int)message->data.result,now))continue;', '{ if(vod_failover(c,now))continue;if(bridge_retry_range(c,(int)message->data.result,now))continue;')
    old = '    if(c->streaming && c->easy && !c->paused && now>=c->upstream_deadline){if(bridge_retry_range(c,CURLE_OPERATION_TIMEDOUT,now))continue;'
    replace(old, '    /* No response headers 6 s after the transfer began: an origin-fetching CDN node, not a slow stream. */\n'
        '    if(c->streaming && c->easy && !c->paused && !c->status && !c->upstream_headers && now>=c->upstream_deadline-VOD_FAILOVER_EARLY && vod_failover(c,now))continue;\n'
        + old.replace('{if(bridge_retry_range(', '{if(vod_failover(c,now))continue;if(bridge_retry_range('))
    source = source.replace('/* Generated production DASH policy; see tools/vod-bridge-source.py. */\n',
        '/* Generated ADR-101 failover DASH bridge; see tools/vod-bridge-failover-source.py. */\n', 1)
    for required in ['vod_transfer_url(c)', 'if(vod_failover(c,now))continue;if(bridge_retry_range(c,(int)', 'now>=c->upstream_deadline-VOD_FAILOVER_EARLY']:
        if required not in source:
            raise ValueError('Failover transformation missing')
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(source)
    return hashlib.sha256(source.encode()).hexdigest()


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python3 tools/vod-bridge-failover-source.py OUTPUT_HEADER')
    print(generate(sys.argv[1]))
