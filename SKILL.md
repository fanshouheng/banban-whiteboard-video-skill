---
name: banban-whiteboard-video
description: Create deterministic Chinese whiteboard explainer videos from a final voiceover, transcript, or timed scene plan. Use when Codex needs to turn spoken Chinese content into persistent board pages, synchronize circles, underlines, arrows, or short handwritten notes to narration, preview annotation alignment, or render a reproducible 16:9 MP4 with HTML, SVG, Playwright, and FFmpeg.
---

# Banban Whiteboard Video

Build a Chinese whiteboard explainer from the included HTML/SVG renderer. Keep the board text typeset and persistent; animate only teacher-style emphasis marks.

## Inputs

Require the final edited voiceover before timing the board. Accept a transcript or rough outline for scene design, but treat the final audio duration as authoritative.

Place the final audio at `output/voiceover.mp3`. Run `ffprobe` to confirm its duration before editing `timeline.json`.

## Workflow

1. Read `timeline.json`, `app.js`, and the supplied transcript or outline.
2. Divide the narration into semantic board pages. Prefer one claim or question per page and keep enough text visible to preserve context.
3. Reuse an existing layout from `app.js`: `flow`, `list`, `journey`, `split`, `equation`, `grid`, `contrast`, `audience`, `statement`, or `final`.
4. Set contiguous scene ranges in `timeline.json` using half-open frame intervals: `start <= frame < end`.
5. Add only useful emphasis annotations. Use `target` for circles and underlines, `from` and `to` for arrows, and explicit paths only when the layout cannot supply a stable target.
6. Keep every annotation inside its scene range. Leave time between marks so the teacher can return to the idle corner.
7. Install dependencies with `npm install`, then run `npm run preview`.
8. Inspect every generated image under `output/playwright/`. Fix missed targets, clipped text, crowding, and awkward teacher movement before rendering.
9. Run `npm run render`. Verify resolution, frame rate, codecs, audio, and duration with `ffprobe`.

## Guardrails

- Do not time against draft narration when a cleaned or edited track exists.
- Do not generate arbitrary HTML, CSS, coordinates, or render commands for each video. Express content in `timeline.json` and extend the renderer only when an existing layout cannot represent the content.
- Do not claim that all Chinese text is hand-drawn. The renderer typesets board text and hand-draws emphasis marks.
- Do not upload `output/` by default. Commit source, the Skill, and intentionally selected lightweight examples only.
- Preserve third-party notices when reusing bundled assets.

## Example

The repository's `timeline.json` is a complete 13-page example synchronized to a 3 minute 38 second Chinese narration. See `examples/ai-newbie-positioning-cover.png`, `examples/ai-newbie-positioning-boards.png`, and `examples/ai-newbie-positioning-preview.mp4` for the public preview.
