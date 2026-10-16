"""Generate original synthetic W01 media with an explicitly installed host ffmpeg.
No downloads, account/content requests, packaging, signing or installation.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['generate', 'check'])
args = parser.parse_args()
out = root/'build/media-probe'
if args.action == 'generate':
 out.mkdir(parents=True, exist_ok=True)
 command = ['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x204050:size=1280x720:rate=24:duration=12','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=12','-vf','drawbox=x=400:y=180:w=480:h=360:color=0x30e080:t=fill,fade=t=in:st=0:d=3,fade=t=out:st=9:d=3,format=yuv420p','-af','volume=0.8','-c:v','libx264','-threads','1','-preset','veryfast','-crf','28','-profile:v','main','-level','3.1','-g','48','-keyint_min','48','-sc_threshold','0','-c:a','aac','-b:a','96k','-ac','2','-map_metadata','-1','-movflags','+faststart','-y','probe.mp4']
 subprocess.run(command,cwd=out,check=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i','probe.mp4','-map','0:v:0','-map','0:a:0','-c','copy','-f','dash','-seg_duration','2','-use_timeline','1','-use_template','1','-init_seg_name','init-$RepresentationID$.mp4','-media_seg_name','segment-$RepresentationID$-$Number%05d$.m4s','-adaptation_sets','id=0,streams=v id=1,streams=a','-y','probe.mpd'],cwd=out,check=True)
 version = subprocess.run(['ffmpeg','-version'],capture_output=True,text=True,check=True).stdout.splitlines()[0]
 if not re.fullmatch(r'ffmpeg version [A-Za-z0-9_. -]+Copyright.*',version): raise SystemExit('Unexpected host tool version format')
 files = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file() and p.suffix in ['.mp4','.m4s','.mpd']}
 (out/'manifest.json').write_text(json.dumps({'schema':1,'source':'original synthetic test pattern and low-volume sine; no third-party media','hostTool':version,'files':files,'tvPlayback':'UNVERIFIED','packaged':False},indent=2)+'\n')
manifest = json.loads((out/'manifest.json').read_text())
for name,digest in manifest['files'].items():
 if not re.fullmatch(r'probe\.(mp4|mpd)|init-[01]\.mp4|segment-[01]-[0-9]{5}\.m4s',name): raise SystemExit('Unexpected media path')
 p=out/name
 if p.is_symlink() or not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest: raise SystemExit('Media integrity mismatch')
 if p.stat().st_size > (3*1024*1024 if name=='probe.mp4' else 512*1024): raise SystemExit('Media fixture bound exceeded')
mpd=ET.parse(out/'probe.mpd').getroot()
for element in mpd.iter():
 if element.tag.endswith('}BaseURL'): raise SystemExit('External/base media URL forbidden')
 if element.tag.endswith('}SegmentTemplate') and (element.get('initialization')!='init-$RepresentationID$.mp4' or element.get('media')!='segment-$RepresentationID$-$Number%05d$.m4s'): raise SystemExit('Unexpected segment template')
info=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_name,profile,width,height,r_frame_rate,sample_rate,channels','-show_entries','format=duration,size','-of','json',str(out/'probe.mp4')],capture_output=True,text=True,check=True).stdout)
video,audio=info['streams']
if video.get('codec_name')!='h264' or video.get('profile')!='Main' or video.get('width')!=1280 or video.get('height')!=720 or video.get('r_frame_rate')!='24/1': raise SystemExit('Unexpected video fixture')
if audio.get('codec_name')!='aac' or audio.get('sample_rate')!='48000' or audio.get('channels')!=2 or float(info['format']['duration'])!=12: raise SystemExit('Unexpected audio/duration fixture')
print(json.dumps({'schema':1,'hostMediaMetadata':'PASS','files':len(manifest['files']),'tvPlayback':'UNVERIFIED','packaged':False,'path':'build/media-probe'},indent=2))
