# Money Management and Budget intro: narration script

Approved by Britt as written, 2026-10-09. Narrated by ElevenLabs voice `DtQLDxHbTiQTpVVanTy1` (pinned in `voice.json`) over an original ElevenLabs Music bed (`music.json`, `music-bed.mp3`).

Video: `Money Management Intro.mp4`, 60 seconds, 1280x720, silent. The narrated master is `Money Management Intro (narrated).mp4`, with captions in `money-management-intro.vtt` and also inside the MP4.
Scene times come from the video itself (frame motion and stills), not from guesses.

| Line | Speak at | Scene on screen | Narration |
|------|----------|-----------------|-----------|
| 1 | 1.5s | Title fades in: "Money Management and Budget" | Welcome to Money Management and Budget. |
| 2 | 7.5s | A pay card slides in and coins stack up | Money comes in. That's your income, whatever it looks like for you this month. |
| 3 | 14.8s | The card leaves and expense tags pop up | Then money goes out, in a lot of directions. |
| 4 | 20.5s | Eight tags float: Rent, Streaming, Groceries, Dining Out, Phone, Games, Transportation, New Shoes | Some of these you have to pay. Others you get to choose. |
| 5 | 27.0s | Tags sort into the Needs box: Rent, Groceries, Phone, Transportation | Needs keep you housed, fed, connected, and able to get to work. |
| 6 | 33.5s | Tags sort into the Wants box: Streaming, Dining Out, Games, New Shoes | Wants are the extras that make life better. Streaming, dining out, games, new shoes. |
| 7 | 40.5s | A bar fills with Needs, then Wants, then Savings | A budget gives every dollar a job. Needs first, then wants, then savings, even if it's a little. |
| 8 | 51.5s | Closing question on the dark background | Here's one to think about. What is one want you could trade for savings? |

97 words in 60 seconds. That's slower than normal talk, so the music has room and the learner has time to read the screen.

## Choices made in this draft

- Line 8 reads the on-screen question word for word, so learners who struggle with reading still get it.
- Line 2 never names a source of income. Nobody has to hear their own situation described, and nobody is left out.
- Line 6 calls wants "the extras that make life better," not waste. The point is order, not guilt.
- The bar on screen is split 50, 30 and 20, but the narration says no numbers. The topic map warns against surplus budgets and figures the instructors haven't supplied. A learner whose needs eat 80 percent of the money shouldn't feel they failed the video.
- No dollar amounts, benefit names, or eligibility rules, per the topic map's cite-or-abstain rule.

## Rebuilding

Run `python3 build_intro_audio.py` from this folder. It reuses the voice takes cached in `~/Library/Caches/spokes-money-intro` and the saved `music-bed.mp3` in this folder, so a rebuild costs no credits. To retake one line, change its text in `beats.json`, delete that line's mp3 from the cache's `narration/` folder, and rerun. The script checks that every line fits its scene, masters with the toolkit's house loudness recipe and gate, and rewrites the captions from the new word timings.

Two things the first build taught:

- ElevenLabs returns each take at its own volume. The opening line came back 13 dB louder than the rest, so the script levels every line before mixing.
- With music filling the gaps, the house loudness step runs in its fallback mode and lands at -14.2 LUFS, inside the -14.2 to -13.2 gate but at its edge. Getting closer to -13.7 would take a harder voice limiter or a quieter music bed.

## Review notes, 2026-10-09

- Whisper transcribes all eight lines word for word, each inside its scene.
- The picture stream is bit-identical to the silent original.
- Music fills every gap between lines. The only near-silence is the fade-in at 0:00 and the last two seconds of the fade-out.
- The model review flagged the needs/wants sort at 0:27. Frame checks did not confirm it: the final sort is right. In the animation itself, though, the Transportation tag sits on the edge of the Wants box from about 0:27 to 0:33 before it moves to Needs at 0:34. Anyone watching the narration say "able to get to work" may read that as a want for a few seconds. That is a fix for the Claude Design file, not the audio.
