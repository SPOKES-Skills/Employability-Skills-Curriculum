#!/usr/bin/env python3
"""Build the narrated Money Management intro: voiceover, music bed, captions.

Usage:
    python3 build_intro_audio.py [--build-dir DIR] [--toolkit DIR] [--check-only]

Reads beats.json, voice.json and music.json beside this script, and the silent
animation at ../Money Management Intro.mp4. Writes:
    music-bed.mp3                          generated once, then reused as-is
    money-management-intro.vtt             caption track (SPOKES A11Y-07)
    ../Money Management Intro (narrated).mp4

Voice takes come from the education toolkit (preflight, generate, trim, align),
so a retake is: delete the take from the build dir's narration/ folder, rerun.
Takes, trimmed wavs and mixes stay in the build dir, outside the repo.

The ElevenLabs key comes from ELEVENLABS_API_KEY in the environment, or the
macOS Keychain (security add-generic-password -s ELEVENLABS_API_KEY -a "$USER" -w).
It is never printed.

--check-only stops after the fit check, before music, mixing and captions.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
SOURCE_VIDEO = HERE.parent / "Money Management Intro.mp4"
OUTPUT_VIDEO = HERE.parent / "Money Management Intro (narrated).mp4"
MUSIC_BED = HERE / "music-bed.mp3"
CAPTIONS = HERE / "money-management-intro.vtt"
DEFAULT_TOOLKIT = Path.home() / "MacDev/companies/education/toolkit/tools"
DEFAULT_BUILD = Path.home() / "Library/Caches/spokes-money-intro"
MUSIC_URL = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192"

VIDEO_SECONDS = 60.0
MIN_GAP_S = 0.3  # silence kept between one line's end and the next line
VOICE_LUFS = -16.0  # voice stem level before the house master
# audit-audio-defects.mjs flagged sub-80 Hz rumble on 4 of 8 takes (12.5-14.6 dB
# separation, WARN under 15). A 12 dB/octave high-pass at 80 Hz removes it.
VOICE_HIGHPASS = "highpass=f=80:p=2"
# Speech true peaks sit 13-17 dB over its loudness. Unlimited, the house loudnorm
# (TP -3) cannot lift the mix to -13.7 LUFS and lands near -14.5, failing the
# gate. Catching peaks at -9 dBFS on the -16 LUFS stem, oversampled 4x so
# between-sample peaks are caught too, brings that gap under 10 dB.
VOICE_PEAK_LIMITER = "aresample=192000,alimiter=limit=0.35:attack=2:release=60:level=disabled,aresample=48000"
MUSIC_LUFS = -27.0  # music bed level between lines
DUCK_GAIN = 0.4  # music gain under speech (about -8 dB)
DUCK_ATTACK_S = 0.25
DUCK_RELEASE_S = 0.5
MUSIC_FADE_IN_S = 1.5
MUSIC_FADE_OUT_S = 3.5
CUE_MERGE_CHARS = 64  # neighbouring sentences up to this length share one caption
CUE_LINE_CHARS = 42
CUE_HOLD_S = 0.4  # a caption stays up this long after its line ends

Span = dict[str, Any]


def run(cmd: list[Any], capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run([str(c) for c in cmd], check=True, text=True, capture_output=capture)


def load_json(path: Path) -> Any:
    with path.open(encoding="utf8") as handle:
        return json.load(handle)


def api_key() -> str:
    if "ELEVENLABS_API_KEY" in os.environ and os.environ["ELEVENLABS_API_KEY"].strip():
        return os.environ["ELEVENLABS_API_KEY"].strip()
    found = subprocess.run(
        ["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"],
        capture_output=True,
        text=True,
        check=False,
    )
    if found.returncode == 0 and found.stdout.strip():
        return found.stdout.strip()
    sys.exit(
        "ELEVENLABS_API_KEY not found. Store it once in the Keychain with:\n"
        '  security add-generic-password -s ELEVENLABS_API_KEY -a "$USER" -w'
    )


def stage_build_dir(build: Path) -> None:
    """Lay out the build dir the way the toolkit tools expect a project."""
    (build / "narration").mkdir(parents=True, exist_ok=True)
    (build / "Sources").mkdir(exist_ok=True)
    for name in ("beats.json", "voice.json"):
        shutil.copyfile(HERE / name, build / "narration" / name)
    lexicon = build / "Sources" / "pronunciations.json"
    if not lexicon.exists():
        lexicon.write_text('{"terms": []}\n', encoding="utf8")


def make_voice_takes(build: Path, toolkit: Path) -> None:
    os.environ["ELEVENLABS_API_KEY"] = api_key()
    run(["node", toolkit / "tts-preflight.mjs", build / "narration" / "beats.json"])
    run(["node", toolkit / "generate-narration.mjs", build])
    run(["node", toolkit / "prepare-narration.mjs", build])
    run(["node", toolkit / "align-cues.mjs", build])


def duration_s(path: Path) -> float:
    probe = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]
    return float(run(probe, capture=True).stdout.strip())


def measure_spans(build: Path, beats: list[dict[str, Any]]) -> list[Span]:
    """Each line's real start and end, from the trimmed shipping wavs."""
    spans = []
    for beat in beats:
        wav = build / "assets" / "narration" / f"{beat['id']}.wav"
        spans.append({**beat, "wav": wav, "end": beat["start"] + duration_s(wav)})
    return spans


def fit_problems(spans: list[Span]) -> list[str]:
    problems = []
    for i, span in enumerate(spans):
        spoken = span["end"] - span["start"]
        if spoken > span["window"]:
            problems.append(f"{span['id']}: {spoken:.2f}s spoken, window is {span['window']}s")
        last = i + 1 == len(spans)
        limit = VIDEO_SECONDS - 0.5 if last else spans[i + 1]["start"] - MIN_GAP_S
        if span["end"] > limit:
            problems.append(f"{span['id']}: ends at {span['end']:.2f}s, must end by {limit:.2f}s")
    return problems


def print_fit_table(spans: list[Span]) -> None:
    print(f"{'line':<12} {'start':>6} {'end':>6} {'spoken':>7} {'window':>7}")
    for s in spans:
        spoken = s["end"] - s["start"]
        print(f"{s['id']:<12} {s['start']:>6.2f} {s['end']:>6.2f} {spoken:>7.2f} {s['window']:>7.2f}")


def make_music_bed() -> None:
    if MUSIC_BED.exists():
        print(f"Keeping existing {MUSIC_BED.name}")
        return
    request = urllib.request.Request(
        MUSIC_URL,
        data=json.dumps(load_json(HERE / "music.json")).encode("utf8"),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=600) as response:  # nosec B310 (fixed https URL)
        MUSIC_BED.write_bytes(response.read())
    print(f"Generated {MUSIC_BED.name}: {duration_s(MUSIC_BED):.1f}s")


def integrated_lufs(path: Path) -> float:
    measure = ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"]
    stderr = run(measure, capture=True).stderr
    block = re.findall(r"\{\s*\"input_i\".*?\}", stderr, flags=re.DOTALL)[-1]
    return float(json.loads(block)["input_i"])


def level_lines(build: Path, spans: list[Span]) -> list[Path]:
    """Bring every take to the same loudness before mixing.

    ElevenLabs returns each take at its own volume: on 2026-10-09 the opening
    line came back 13 dB louder than the lines after it.
    """
    folder = build / "leveled"
    folder.mkdir(exist_ok=True)
    return [gain_to(span["wav"], VOICE_LUFS, folder / f"{span['id']}.wav", VOICE_HIGHPASS) for span in spans]


def mix_voice(build: Path, spans: list[Span]) -> Path:
    """Place every leveled line at its start time on one 60-second voice stem."""
    inputs: list[Any] = []
    chains, labels = [], []
    for i, (span, wav) in enumerate(zip(spans, level_lines(build, spans))):
        inputs += ["-i", wav]
        chains.append(f"[{i}:a]adelay={round(span['start'] * 1000)}:all=1[v{i}]")
        labels.append(f"[v{i}]")
    mixdown = f"{''.join(labels)}amix=inputs={len(spans)}:normalize=0,apad,atrim=0:{VIDEO_SECONDS}[out]"
    raw = build / "voice-raw.wav"
    graph = ";".join([*chains, mixdown])
    encode = ["-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", raw]
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, *encode])
    limited = gain_to(raw, VOICE_LUFS, build / "voice-limited.wav", VOICE_PEAK_LIMITER)
    return gain_to(limited, VOICE_LUFS, build / "voice-stem.wav")


def gain_to(source: Path, target_lufs: float, out: Path, after: str = "") -> Path:
    """Set a stem's integrated loudness, optionally followed by more filters.

    Writes 32-bit float so a gain boost cannot clip before a limiter sees it.
    """
    gain = target_lufs - integrated_lufs(source)
    chain = f"volume={gain:.2f}dB" + (f",{after}" if after else "")
    run(["ffmpeg", "-v", "error", "-y", "-i", source, "-af", chain, "-c:a", "pcm_f32le", out])
    return out


def duck_expression(spans: list[Span]) -> str:
    """Music gain over time: 1 between lines, DUCK_GAIN under speech, smooth ramps."""
    terms = []
    for s in spans:
        rise = f"clip((t-({s['start']:.3f}-{DUCK_ATTACK_S}))/{DUCK_ATTACK_S},0,1)"
        fall = f"clip((({s['end']:.3f}+{DUCK_RELEASE_S})-t)/{DUCK_RELEASE_S},0,1)"
        terms.append(f"min({rise},{fall})")
    under = terms[0]
    for term in terms[1:]:
        under = f"max({under},{term})"
    return f"1-{1 - DUCK_GAIN:.2f}*{under}"


def mix_music(build: Path, spans: list[Span]) -> Path:
    trimmed = build / "music-trimmed.wav"
    fades = (
        f"atrim=0:{VIDEO_SECONDS},afade=t=in:d={MUSIC_FADE_IN_S},"
        f"afade=t=out:st={VIDEO_SECONDS - MUSIC_FADE_OUT_S}:d={MUSIC_FADE_OUT_S}"
    )
    run(["ffmpeg", "-v", "error", "-y", "-i", MUSIC_BED, "-af", fades, "-ar", "48000", "-ac", "2", trimmed])
    ducking = f"volume='{duck_expression(spans)}':eval=frame"
    return gain_to(trimmed, MUSIC_LUFS, build / "music-stem.wav", ducking)


def master_video(build: Path, toolkit: Path, voice_stem: Path, music_stem: Path) -> Path:
    """Lay the mix under the silent video, then master with the house recipe.

    The premaster keeps lossless audio so the master is the only AAC encode.
    """
    premaster = build / "premaster.mov"
    run([
        "ffmpeg", "-v", "error", "-y", "-i", SOURCE_VIDEO, "-i", voice_stem, "-i", music_stem,
        "-filter_complex", "[1:a][2:a]amix=inputs=2:normalize=0[mix]",
        "-map", "0:v:0", "-map", "[mix]", "-c:v", "copy", "-c:a", "pcm_s24le",
        "-t", VIDEO_SECONDS, premaster,
    ])  # fmt: skip
    master = build / "master.mp4"
    run([sys.executable, toolkit / "normalize-loudness.py", premaster, master])
    run(["node", toolkit / "verify-loudness.mjs", master])
    return master


def sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def caption_groups(text: str) -> list[str]:
    """Merge short neighbouring sentences so no caption flashes by."""
    groups: list[str] = []
    for sentence in sentences(text):
        if groups and len(groups[-1]) + 1 + len(sentence) <= CUE_MERGE_CHARS:
            groups[-1] = f"{groups[-1]} {sentence}"
        else:
            groups.append(sentence)
    return groups


def wrap(text: str) -> str:
    """Split a caption over two lines near the middle, after a comma if one is close."""
    if len(text) <= CUE_LINE_CHARS:
        return text
    spaces = [i for i, ch in enumerate(text) if ch == " "]
    comma_bonus = CUE_LINE_CHARS / 6
    cut = min(spaces, key=lambda i: abs(i - len(text) / 2) - (comma_bonus if text[i - 1] in ",;" else 0))
    return f"{text[:cut]}\n{text[cut + 1:]}"


def stamp(seconds: float) -> str:
    minutes, secs = divmod(max(seconds, 0.0), 60)
    return f"00:{int(minutes):02d}:{secs:06.3f}"


def span_cues(span: Span, words: list[list[Any]], next_start: float) -> list[tuple[float, float, str]]:
    """Captions for one line, timed from the toolkit's word cues."""
    groups = caption_groups(span["text"])
    counts = [len(g.split()) for g in groups]
    if len(words) != sum(counts):
        sys.exit(f"{span['id']}: {len(words)} word cues for {sum(counts)} script words; rerun align-cues")
    starts, index = [], 0
    for count in counts:
        starts.append(span["start"] + float(words[index][0]))
        index += count
    line_end = min(span["end"] + CUE_HOLD_S, next_start - 0.05)
    ends = [s - 0.05 for s in starts[1:]] + [line_end]
    return list(zip(starts, ends, groups))


def write_captions(build: Path, spans: list[Span]) -> None:
    word_cues = load_json(build / "narration" / "cues.json")
    blocks = ["WEBVTT", ""]
    for i, span in enumerate(spans):
        next_start = spans[i + 1]["start"] if i + 1 < len(spans) else VIDEO_SECONDS
        for start, end, text in span_cues(span, word_cues[span["id"]], next_start):
            blocks += [f"{stamp(start)} --> {stamp(end)}", wrap(text), ""]
    CAPTIONS.write_text("\n".join(blocks), encoding="utf8")
    print(f"Wrote {CAPTIONS.name}")


def attach_captions(master: Path) -> None:
    """Final file: mastered audio plus the captions as a selectable track."""
    run([
        "ffmpeg", "-v", "error", "-y", "-i", master, "-i", CAPTIONS,
        "-map", "0:v", "-map", "0:a", "-map", "1:s", "-c:v", "copy", "-c:a", "copy",
        "-c:s", "mov_text", "-metadata:s:s:0", "language=eng", "-movflags", "+faststart", OUTPUT_VIDEO,
    ])  # fmt: skip
    print(f"Wrote {OUTPUT_VIDEO.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--build-dir", type=Path, default=DEFAULT_BUILD)
    parser.add_argument("--toolkit", type=Path, default=DEFAULT_TOOLKIT)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    stage_build_dir(args.build_dir)
    make_voice_takes(args.build_dir, args.toolkit)
    spans = measure_spans(args.build_dir, load_json(HERE / "beats.json"))
    print_fit_table(spans)
    problems = fit_problems(spans)
    if problems:
        sys.exit("Lines that do not fit their scene:\n  " + "\n  ".join(problems))
    if args.check_only:
        return
    make_music_bed()
    voice_stem = mix_voice(args.build_dir, spans)
    music_stem = mix_music(args.build_dir, spans)
    master = master_video(args.build_dir, args.toolkit, voice_stem, music_stem)
    write_captions(args.build_dir, spans)
    attach_captions(master)


if __name__ == "__main__":
    main()
