# Embervale

An endless, warm, remembered open world that runs in the browser. Golden-hour light,
rolling fields, quiet lakes, drifting clouds, wind grass, campfires — and a world that
never repeats on you when you return.

## Run

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works (there is no build step). Three.js is loaded from a CDN,
so the first launch needs internet access.

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
src/
  rng.js          seeded PRNG, hash, seeded 2D simplex noise
  gen.js          terrain height + moisture + biome color (pure math, node-testable)
  world.js        chunk streaming, 15s retention, persistent cache, scatter, campfires
  environment.js  sky shader, sun-time palette, water shader, clouds, lighting, fog
  player.js       first-person controller (walk, wade, sprint, jump, flight)
  audio.js        procedural wind / pad / birdsong ambience (Web Audio, no assets)
  main.js         bootstrap, render loop, post-processing, HUD, save/load
scripts/tune.mjs  offline stats for the terrain generator (node scripts/tune.mjs)
```

All procedural generation is pure math driven by the world seed — no assets, no server,
no downloads. Landscapes vary: warm valleys, forested hills, rocky ridges with snow caps,
wide lakes, sandy shores.
