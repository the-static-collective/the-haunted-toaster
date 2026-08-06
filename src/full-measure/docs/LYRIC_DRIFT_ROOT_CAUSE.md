# Haunted Toaster Lyric Drift Root Cause

The progressive lyric drift at varying frame rates was caused by expressions inside the FFmpeg zoompan filter (e.g. `zoompan=z='1.035+0.018*sin(on/150)'`). The variable `on` corresponds to the frame index, which progresses faster at higher frame rates (e.g. 60fps vs 30fps), thereby decoupling the visual effect frequency from true media time. The fix was to use `in_time`, which reliably tracks seconds across any framerate constraint.

To preserve the original 30fps motion rate, the denominators were scaled (e.g. `on/150` at 30fps becomes `in_time / (150/30)` = `in_time/5`).

Additionally, the cue selection semantics between the frontend UI (preview) and the ASS generation (render) were desynchronized and potentially overlapping. Introducing a strict single source of truth for interval mechanics resolves preview/render parity and prevents cue swallowing.

ASS lyric text strips braces (`{`, `}`) and backslashes (`\`) explicitly to prevent override markup injection, while mapping newlines to `\N` intentionally. This trusted sanitization policy prevents unintended visual corruption.