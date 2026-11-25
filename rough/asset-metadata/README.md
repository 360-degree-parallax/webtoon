# Asset metadata v1

Additive research catalog; not wired to runtime. No existing CSV, images, UI or model files changed.

- sfx.json: 615 words, 2460 variant references. Original CSV categories and legacy flag preserved.
- procedural.json: focus/speed, fade/watercolor/ink, user overlay template.
- semantic candidates are heuristic suggestions, not verified labels. Empty arrays and null mean unknown, not negative labels.
- Each variant has a distinct ID. Visual labels remain null until actual PNG analysis.
- Source IDs are stable; source CSV SHA is recorded. No new image assets.
- Existing cut taxonomy: docs/codebook.md. Role and purpose candidates reuse those labels.
- Next: decode PNGs, measure alpha bbox, occupancy, aspect ratio, ink density, connected components and orientation; manually review stroke character, emotion and placement suitability. Do not infer these from A/B/C/D letters. Validate source paths, review candidates, then evaluate recommendation usefulness before runtime integration.
- Pressure lines are not catalogued as implemented because current materials.js only accepts focus/speed.
