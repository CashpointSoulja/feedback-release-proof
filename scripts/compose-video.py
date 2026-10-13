#!/usr/bin/env python3
"""Compose verified continuous public footage; never substitute stills for footage."""
import argparse
import hashlib
import ipaddress
import json
import pathlib
import re
import shutil
import subprocess
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run([str(a) for a in args], check=True)

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(path)], text=True))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def assert_cfr_timestamps(path, expected_count=None):
    timestamps = json.loads(subprocess.check_output([
        'ffprobe','-v','error','-select_streams','v:0','-show_frames',
        '-show_entries','frame=best_effort_timestamp_time','-of','json',str(path)
    ], text=True))['frames']
    if expected_count is not None and len(timestamps) != expected_count:
        raise SystemExit(f'Wrong decoded timestamp count: {len(timestamps)}')
    for index, frame in enumerate(timestamps):
        # ffprobe prints six decimal places; permit only its decimal rounding.
        if 'best_effort_timestamp_time' not in frame or abs(float(frame['best_effort_timestamp_time']) - index/30) > .000002:
            raise SystemExit(f'Non-CFR timestamp at frame {index}; expected {index}/30 seconds.')
    return len(timestamps)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture', type=pathlib.Path, default=ROOT / 'work/recording/capture')
    parser.add_argument('--voice', type=pathlib.Path, default=ROOT / 'work/recording/voice')
    parser.add_argument('--out', type=pathlib.Path, default=ROOT / 'work/recording/final')
    args = parser.parse_args()
    for name in ['ffmpeg', 'ffprobe']:
        if not shutil.which(name): raise SystemExit(f'Missing {name}.')
    source = (ROOT / 'docs/video-storyboard.md').read_text()
    block = source.split('<!-- recording-plan:start -->',1)[1].split('<!-- recording-plan:end -->',1)[0]
    plan = json.loads(re.search(r'```json\s*(.*?)\s*```', block, re.S).group(1))
    try:
        capture = json.loads((args.capture / 'capture-manifest.json').read_text())
        voice = json.loads((args.voice / 'voice-manifest.json').read_text())
    except FileNotFoundError:
        raise SystemExit('Missing successful public capture or voice manifest. Composition is blocked; no local footage fallback is permitted.')
    public = urlsplit(capture['public_url'])
    if public.scheme != 'https' or not public.hostname or capture.get('status') != 'passed':
        raise SystemExit('Capture is not a completed public HTTPS recording.')
    if not capture.get('public_dns_addresses') or any(not ipaddress.ip_address(a).is_global for a in capture['public_dns_addresses']):
        raise SystemExit('Capture lacks verified public DNS addresses.')
    expected = hashlib.sha256(source.encode()).hexdigest()
    if capture.get('storyboard_sha256') != expected or voice.get('storyboard_sha256') != expected:
        raise SystemExit('Storyboard changed after capture/voice. Regenerate both inputs.')
    if capture.get('continuous') is not True or capture.get('width') != 720 or capture.get('height') != 1280 or capture.get('duration') != 105:
        raise SystemExit('Capture does not match the continuous vertical 105-second contract.')
    if {s['id'] for s in capture.get('scenes', [])} != {s['id'] for s in plan['scenes']}:
        raise SystemExit('Capture is missing required scene assertions.')
    narration = args.voice / 'narration.wav'
    if sha(narration) != voice['audio_sha256']: raise SystemExit('Voice checksum mismatch.')
    raw = args.capture / 'raw.ffconcat'
    frame_list = args.capture / 'frames.json'
    if sha(frame_list) != capture['frames_manifest_sha256']: raise SystemExit('Browser source frame manifest changed.')
    if sha(args.capture / 'api-responses.json') != capture['api_responses_sha256']: raise SystemExit('Actual public API response evidence changed.')
    exported = args.capture / 'downloads' / capture['export']['filename']
    if sha(exported) != capture['export']['sha256']: raise SystemExit('Actual downloaded export changed.')
    frames = json.loads(frame_list.read_text())
    if len(frames) < 2: raise SystemExit('Insufficient browser frames.')
    for item in frames:
        path = args.capture / item['file']
        if sha(path) != item['sha256']: raise SystemExit(f'Browser-frame checksum mismatch: {path.name}')
    if sha(raw) != capture['raw_concat_sha256']: raise SystemExit('Raw source timestamp list changed.')
    args.out.mkdir(parents=True, exist_ok=True)
    normalized = args.out / 'continuous-cfr-full.mp4'
    final = args.out / 'ayo-feedback-release-proof-105s.mp4'
    # Normalize the ENTIRE sparse timestamp stream before any trim. A static browser
    # interval must hold its real frame for its true duration, never become a slideshow.
    run('ffmpeg','-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',raw,
        '-vf','fps=30,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-an',normalized)
    full = probe(normalized)
    if float(full['format']['duration']) < 105: raise SystemExit('Normalized continuous source is shorter than 105 seconds.')
    normalized_frames = assert_cfr_timestamps(normalized)
    run('ffmpeg','-y','-hide_banner','-loglevel','warning','-i',normalized,'-i',narration,
        '-filter_complex','[0:v]trim=start_frame=0:end_frame=3150,setpts=PTS-STARTPTS[v];[1:a]atrim=duration=105,asetpts=PTS-STARTPTS[a]',
        '-map','[v]','-map','[a]','-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-b:a','160k',
        '-fps_mode','cfr','-r','30','-movflags','+faststart',final)
    result = probe(final)
    video = next((s for s in result['streams'] if s['codec_type'] == 'video'), None)
    audio = next((s for s in result['streams'] if s['codec_type'] == 'audio'), None)
    if not video or not audio: raise SystemExit('Final video/audio stream missing.')
    if (video['width'],video['height'],video['r_frame_rate'],int(video['nb_read_frames'])) != (720,1280,'30/1',3150):
        raise SystemExit('Final dimensions, frame rate or frame count is incorrect.')
    if abs(float(result['format']['duration']) - 105) > .05: raise SystemExit('Final duration is not 105 seconds.')
    assert_cfr_timestamps(final, 3150)
    review = args.out / 'review-stills'
    review.mkdir(exist_ok=True)
    for scene in plan['scenes']:
        times = [('start',scene['start']),('middle',(scene['start']+scene['end'])/2),('end',scene['end']-1/30)]
        for label, timestamp in times:
            run('ffmpeg','-y','-hide_banner','-loglevel','error','-ss',f'{timestamp:.6f}','-i',final,'-frames:v','1',review / f'{scene["id"]}-{label}.png')
    manifest = {'status':'technical checks passed; human review pending','public_url':capture['public_url'],
        'capture_sha256':sha(args.capture / 'capture-manifest.json'),'voice':voice['voice'],'video_sha256':sha(final),
        'duration':105,'frames':3150,'width':720,'height':1280,'fps':30,
        'human_full_watch_and_listen':'pending','ayo_approval':'pending','sharing':'not authorized by this script',
        'review_stills':21,'storyboard_sha256':expected,
        'full_source_cfr_frames':normalized_frames,'frame_timestamps':'every final frame verified at index/30 seconds'}
    (args.out / 'video-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{final}\nTechnical checks passed. Ayo must inspect all stills and watch/listen to the full cut before sharing.')

if __name__ == '__main__':
    main()
