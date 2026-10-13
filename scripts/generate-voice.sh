#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - "$@" <<'PY'
import hashlib, json, os, pathlib, re, shutil, subprocess, sys

root = pathlib.Path.cwd()
out = pathlib.Path(os.environ.get('VOICE_DIR', 'work/recording/voice')).resolve()
out.mkdir(parents=True, exist_ok=True)
source = (root / 'docs/video-storyboard.md').read_text()
block = source.split('<!-- recording-plan:start -->', 1)[1].split('<!-- recording-plan:end -->', 1)[0]
plan = json.loads(re.search(r'```json\s*(.*?)\s*```', block, re.S).group(1))
args = sys.argv[1:]
if args != ['--free'] and not (len(args) == 2 and args[0] == '--ayo'):
    raise SystemExit('Usage: scripts/generate-voice.sh --free | --ayo /path/to/recorded-audio')
for tool in ('ffmpeg', 'ffprobe'):
    if not shutil.which(tool): raise SystemExit(f'Missing required tool: {tool}')

def run(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)

def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)], text=True))

voice = out / 'narration.wav'
metadata = {'duration': plan['duration'], 'storyboard_sha256': hashlib.sha256(source.encode()).hexdigest(), 'human_listen_review': 'pending', 'paid_service': False}
if args[0] == '--ayo':
    recorded = pathlib.Path(args[1]).resolve()
    if not recorded.is_file(): raise SystemExit('Ayo recorded audio file does not exist.')
    actual = duration(recorded)
    if not (104.9 <= actual <= 105.1):
        raise SystemExit(f'Ayo narration must already match the 105-second timeline (received {actual:.3f}s). Re-record with the seven scene starts; do not silently time-stretch personal speech.')
    run('ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(recorded),'-af','apad,atrim=duration=105,asetpts=PTS-STARTPTS','-ar','48000','-ac','1',str(voice))
    metadata.update({'voice': 'Ayo supplied recording', 'source_sha256': hashlib.sha256(recorded.read_bytes()).hexdigest(), 'scene_alignment': 'requires Ayo listening review'})
else:
    espeak = shutil.which('espeak-ng') or shutil.which('espeak')
    filters = subprocess.check_output(['ffmpeg','-hide_banner','-filters'], stderr=subprocess.STDOUT, text=True)
    if not espeak and ' flite ' not in filters:
        raise SystemExit('No free local voice engine found. Install espeak-ng or an ffmpeg build with libflite, or supply --ayo audio.')
    parts = []
    for index, scene in enumerate(plan['scenes']):
        text = out / f'{index:02d}-{scene["id"]}.txt'
        text.write_text(scene['narration'])
        raw = out / f'{index:02d}-raw.wav'
        segment = out / f'{index:02d}-timed.wav'
        if espeak:
            run(espeak,'-v','en','-s','162','-f',str(text),'-w',str(raw))
        else:
            # Relative controlled filenames avoid user text being interpreted as filter syntax.
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i',f'flite=textfile={text.name}:voice=slt','-ar','48000','-ac','1',str(raw)], cwd=out, check=True)
        slot = scene['end'] - scene['start']
        measured = duration(raw)
        speed = max(1.0, measured / (slot - .35))
        if speed > 1.22:
            raise SystemExit(f'{scene["id"]} speech needs {measured:.2f}s in a {slot}s scene. Shorten narration or provide a better paced Ayo recording.')
        run('ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(raw),'-af',f'atempo={speed:.8f},apad,atrim=duration={slot},asetpts=PTS-STARTPTS','-ar','48000','-ac','1',str(segment))
        parts.append(segment)
    # Paths are quoted for ffconcat syntax, not shell interpolation.
    listing = out / 'voice.ffconcat'
    listing.write_text('ffconcat version 1.0\n' + ''.join("file '" + str(p).replace("'", "'\\''") + "'\n" for p in parts))
    run('ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c:a','pcm_s16le',str(voice))
    metadata.update({'voice': 'free local synthetic guide voice', 'engine': pathlib.Path(espeak).name if espeak else 'ffmpeg libflite slt', 'scene_alignment': 'generated per storyboard slot'})
actual = duration(voice)
if abs(actual - plan['duration']) > .01: raise SystemExit(f'Voice output has wrong duration: {actual}')
metadata['audio_sha256'] = hashlib.sha256(voice.read_bytes()).hexdigest()
(out / 'voice-manifest.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(f'Generated {voice}: {actual:.3f}s. Listening review is pending.')
PY
