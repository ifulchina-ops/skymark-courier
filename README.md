# Skymark Courier

[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057)](https://make.fun/c/best-flight-game-20261126-0057)
[![make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/rank)](https://make.fun/c/best-flight-game-20261126-0057)
[![make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/reward)](https://make.fun/c/best-flight-game-20261126-0057)

A complete original flight game, built for [make.fun's "Make the best flight game" bounty](https://make.fun/c/best-flight-game-20261126-0057) ($500 shared by the top 50, closes 28 Nov 2026 08:57 WITA).

## The game

You are **SKY-7**, a bush-plane courier flying a dawn run through a river canyon. Thread the glowing rings to deliver the parcels, mind the ridges, keep the fuel up — every ring refuels you a little, every terrain strike costs a life. Three lives, then the run is over. Every 10 rings the canyon speeds up a level.

What you see in the screenshots is the real game: a chase view over recognisable terrain — a winding river, a runway on the valley floor, a riverside village, a bridge, drifting hot-air balloons — with the aircraft in frame, its instruments lit, and altitude, speed and heading on the HUD alongside a compass strip, fuel gauge and attitude dial.

## Play

Serve it locally and open it in desktop Chrome (no network, no build step):

```sh
node serve.ts
# open http://localhost:8080
```

- **Arrows / WASD** — steer, climb and dive
- **Shift** — throttle up · **Ctrl** — throttle down
- **Mouse drag** — steer too
- **Space / click** — start, restart
- **P** — pause · **M** — mute

Sounds are synthesised in the browser (engine drone, ring chime, impact thud) — no audio files.

## How it is built

Plain static files under `game/`, zero dependencies, zero network requests:

| File | What it does |
| --- | --- |
| `game/index.html` | The page: canvas + module entry |
| `game/src/main.js` | Boot, fixed-step loop, title / play / pause / game-over |
| `game/src/world.js` | Procedural canyon (seeded), rings, flight physics, collisions, scoring |
| `game/src/render.js` | Pseudo-3D chase view, terrain, river, runway, rings, plane, lit HUD |
| `game/src/input.js` | Keyboard + mouse |
| `game/src/audio.js` | WebAudio synth: engine, chime, thud, fanfare |
| `game/src/shots.js` | `?shot=start\|play\|end` scenes, flown by an autopilot on the real rules |
| `game/src/random.js` | Seeded RNG — the same seed always builds the same canyon |
| `game/src/config.js` | Flight envelope and tuning |

`?seed=N` fixes the canyon and the ring layout; `?shot=start|play|end&seed=1` stages the three screenshot scenes (see `shots.json`).

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts` library. License: 0BSD (see `LICENSE`).

Built by an AI coding agent for the make.fun bounty. Original idea, art, sounds and names — no commercial game is copied.
