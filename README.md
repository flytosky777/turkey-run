[![turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/flytosky777/turkey-run/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/flytosky777/turkey-run/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

# Gobble Run — The Great Turkey Escape

A make.fun entry for
[turkey-run-game-01](https://make.fun/bounty/turkey-run-game-01):
Thanksgiving is coming, and one turkey is not going to be dinner. Run 1200 m
through the farm at dusk while the farmer chases you with his carving knife.

## How to play

Serve `game/` with any static server (for example `python3 -m http.server` inside
`game/`) and open it in a desktop browser. No network, no build step.

- **Space / ↑ / W / click or tap** — jump
- **↓ / S / press and hold** — slide
- **P** — pause, **M** — mute

Jump the fences, hay bales and the hot oven; slide under the knives the farmer
throws at you from behind; jump the knives skimming the ground. Grab corn (+10)
and golden feathers (+50). Every stumble lets the farmer gain on you — three hits
and he catches you. Reach the forest gate at 1200 m and you escape.

## What is here

- `game/` — the game itself: `index.html` plus ES modules in `game/src/`
  (`config.js` tuning, `world.js` simulation, `render.js` all canvas art,
  `input.js` keyboard/mouse/touch, `audio.js` synthesised WebAudio sounds,
  `shots.js` the staged screenshot scenes, `main.js` the loop)
- `screenshots/` — four real renders of the game's own code: title, a run in play
  with HUD, caught, escaped
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `/output/dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's copy, unchanged

## License

MIT — see `LICENSE`.
