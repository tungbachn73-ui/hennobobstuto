# Embervale

An endless, warm, remembered open world that runs in the browser. Golden-hour light,
rolling fields, quiet lakes, drifting clouds, wind grass, campfires — and a world that
never repeats on you when you return.

## Run

**Double-click `index.html`.** It is a single, fully self-contained file — the
Three.js engine, shaders, and all game code are inlined inside it (~950 kb). No
internet, no server, no install needed; it works straight from disk.

For development:

```bash
npm install
npm start          # serves the folder, open http://localhost:8000/dev.html

npm test           # runs smoke, boot, and bundled-boot tests in node
npm run build      # regenerates index.html from src/ (uses inlined engine)
```

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look (click to lock) |
| W A S D | Move |
| Shift | Sprint |
| Space | Jump / rise in flight |
| C | Descend in flight |
| F | Toggle flight mode |
| E | Place a campfire |
| T | Toggle the flow of time |
| M | Toggle sound |
| H | Hide/show UI |
| `[` `]` | Draw distance |

## The core mechanic — a world that remembers

- The terrain is infinite: chunks of 96×96 units are generated around you from a seeded,
  deterministic height function (simplex noise, domain warping, ridged mountains).
- Every chunk you can see marks itself as seen. One that goes unseen — outside your draw
  distance **or outside the camera frustum** — starts a **15-second** countdown
  (`RETENTION_MS` in `src/world.js`).
- When the countdown expires the chunk is deleted from the scene and its GPU resources
  (terrain geometry, instanced trees/rocks/grass buffers) are disposed.
- Its heightfield and moisture data stay in an in-memory persistent cache, and every object
  you placed (campfires) is stored per-chunk in an edit log, so when you come back the
  chunk is rebuilt **bit-identically** — same trees, same rocks, same fires. The HUD counts
  how many chunks were "remembered".
- Your journey (seed, position, time of day, campfires) is also saved to `localStorage`
  every 8 seconds, so nothing is lost across reloads either.

## Architecture

```
index.html       all-in-one single file: engine + game inlined (double-click to play)
dev.html         modular source version for development (serve the folder)
src/
  rng.js          seeded PRNG, hash, seeded 2D simplex noise
  gen.js          terrain height + moisture + biome color (pure math, node-testable)
  world.js        chunk streaming, 15s retention, persistent cache, scatter, campfires
  environment.js  sky shader, sun-time palette, water shader, clouds, lighting, fog
  player.js       first-person controller (walk, wade, sprint, jump, flight)
  audio.js        procedural wind / pad / birdsong ambience (Web Audio, no assets)
  main.js         bootstrap, render loop, HUD, save/load (no post-processing dependency)
scripts/          build-single.mjs (esbuild all-in-one), bundle-smoke.mjs (runs the
                  built file headlessly), smoke.mjs / boot-smoke.mjs, tune.mjs
```

## Troubleshooting

- If anything goes wrong at startup or while rendering, a red banner appears with
  the exact reason (unsupported or unavailable WebGL, broken GPU driver, etc.).
- Rendering failures stop the loop instead of leaving a black screen.
- If pointer lock is unavailable (sandboxed previews), the game falls back to
  hold-and-drag looking instead of mouselook.

All procedural generation is pure math driven by the world seed — no assets, no server,
no downloads. Landscapes vary: warm valleys, forested hills, rocky ridges with snow caps,
wide lakes, sandy shores.
