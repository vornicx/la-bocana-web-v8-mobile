import base64
import glob
import json
import re
import subprocess
from pathlib import Path

BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
PROBE_CHARS = 'AQgw'


def run(command):
    return subprocess.run(command, capture_output=True, text=True)


def decode_candidate(segments, boundary, char, output_path):
    encoded = ''.join(segments[: boundary + 1]) + char + ''.join(segments[boundary + 1 :])
    encoded = ''.join(encoded.split())
    encoded += '=' * ((4 - len(encoded) % 4) % 4)
    try:
        data = base64.b64decode(encoded, validate=True)
    except Exception:
        return False
    if not data.startswith(bytes.fromhex('1a45dfa3')):
        return False
    output_path.write_bytes(data)
    return True


def probe(path):
    result = run([
        'ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_read_packets:format=duration', '-of', 'json', str(path)
    ])
    duration = 0.0
    packets = 0
    try:
        payload = json.loads(result.stdout or '{}')
        duration = float(payload.get('format', {}).get('duration') or 0)
        streams = payload.get('streams') or []
        if streams:
            packets = int(streams[0].get('nb_read_packets') or 0)
    except Exception:
        pass
    penalty = len(result.stderr or '') + (5000 if result.returncode else 0)
    return duration, packets, penalty


def score(info):
    duration, packets, penalty = info
    duration_bonus = 100000 if 90 <= duration <= 100 else 0
    return duration_bonus + packets * 100 - penalty


subprocess.run(['git', 'fetch', 'origin', 'main'], check=True)
source = subprocess.check_output(
    ['git', 'show', 'origin/main:components/admin/demo-video-data/part-00.ts'], text=True
)
match = re.fullmatch(r"export default '([^']*)';\s*", source, re.S)
if not match:
    raise SystemExit('Could not read the first demo-video chunk from main')

head = match.group(1)
part_paths = sorted(glob.glob('.tmp/demo-video/part-*.b64'))
if not part_paths:
    raise SystemExit('No continuation chunks found')
segments = [head] + [Path(path).read_text(encoding='utf-8').strip() for path in part_paths]
raw_length = sum(len(segment) for segment in segments)
print(f'Loaded {len(segments)} segments / {raw_length} base64 chars')
print('Segment lengths:', [len(segment) for segment in segments])

# The staged payload is one Base64 character short. First locate the damaged boundary
# cheaply with ffprobe, then brute-force only the two most plausible boundaries.
boundary_scores = []
for boundary in range(len(segments)):
    best = None
    for char in PROBE_CHARS:
        candidate = Path(f'/tmp/probe-{boundary}-{ord(char)}.webm')
        if not decode_candidate(segments, boundary, char, candidate):
            continue
        info = probe(candidate)
        item = (score(info), boundary, char, info)
        if best is None or item[0] > best[0]:
            best = item
    if best:
        boundary_scores.append(best)
        print('Boundary probe:', best)

if not boundary_scores:
    raise SystemExit('No valid WebM candidates could be decoded')

boundary_scores.sort(reverse=True)
selected_boundaries = [item[1] for item in boundary_scores[:2]]
print('Selected boundaries for exact recovery:', selected_boundaries)

candidates = []
for boundary in selected_boundaries:
    for char in BASE64_ALPHABET:
        candidate = Path(f'/tmp/exact-{boundary}-{ord(char)}.webm')
        if not decode_candidate(segments, boundary, char, candidate):
            continue
        info = probe(candidate)
        if 90 <= info[0] <= 100:
            candidates.append((score(info), boundary, char, info, candidate))

if not candidates:
    raise SystemExit('No 90-100 second recovery candidate survived probing')

# The source upload can carry a harmless Matroska/WebM container warning at EOF.
# What matters here is that the complete video stream decodes successfully. We then
# transcode it and require the resulting MP4 itself to pass strict validation.
candidates.sort(reverse=True, key=lambda item: item[0])
decoded = []
for item in candidates:
    candidate_score, boundary, char, info, candidate = item
    decode = run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(candidate), '-map', '0:v:0', '-f', 'null', '-'])
    warning = decode.stderr.strip()
    print(
        f'Full decode boundary={boundary} char={char!r} probe={info} '
        f'rc={decode.returncode} warning_bytes={len(warning)}'
    )
    if decode.returncode == 0:
        decoded.append((len(warning), -candidate_score, boundary, char, candidate, warning))

if not decoded:
    raise SystemExit('Recovered container metadata, but no candidate decoded end-to-end')

decoded.sort(key=lambda item: (item[0], item[1], item[2], item[3]))
warning_len, _, boundary, char, selected, warning = decoded[0]
print(f'Recovery selected boundary={boundary}, char={char!r}, source_warning_bytes={warning_len}')
if warning:
    print('Source warning:', warning[:500])

output = Path('/tmp/demo-la-bocana.mp4')
transcode = run([
    'ffmpeg', '-y', '-v', 'error', '-i', str(selected),
    '-map', '0:v:0', '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(output)
])
if transcode.returncode:
    print(transcode.stderr[-1000:])
    raise SystemExit('ffmpeg could not transcode the recovered demo')

final_probe = probe(output)
size = output.stat().st_size
final_decode = run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(output), '-map', '0:v:0', '-f', 'null', '-'])
print(
    f'Final MP4: {size} bytes / probe={final_probe} / '
    f'decode_rc={final_decode.returncode} / warning_bytes={len(final_decode.stderr.strip())}'
)
if size < 50_000 or not (90 <= final_probe[0] <= 100):
    raise SystemExit('Recovered MP4 failed duration/size validation')
if final_decode.returncode != 0 or final_decode.stderr.strip():
    print(final_decode.stderr[-1000:])
    raise SystemExit('Recovered MP4 did not decode cleanly')
