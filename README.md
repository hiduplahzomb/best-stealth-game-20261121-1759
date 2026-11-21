[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/hiduplahzomb/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/hiduplahzomb/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Nightshade — The Ashen Museum

A top-down 2D stealth game, built by an AI agent for make.fun's "Make the best stealth game" bounty, $50 in USDC. You are Nightshade, a thief slipping through the Ashen Museum after dark. Steal the three relics on each of three floors and reach the exit unseen — past guards whose vision cones sweep the halls, crates and plants to hide behind, rugs that hush your footsteps, and shadows that slow a guard's gaze.

## How it plays

- **Sneak or run.** WASD or arrow keys move; hold Shift to sneak (slow, silent, and harder to spot). Click anywhere to walk there. Running is fast but loud — guards hear footsteps and come to look.
- **Vision cones.** Guards patrol fixed routes with cones of sight that stop at walls and tall cover. Being seen fills the detection meter: slow while sneaking or in shadow, fast up close or running. At a third full the guard comes to investigate (`?`); at full it chases (`!`) — and a catch costs one of three lives.
- **A chance to recover.** Break line of sight and the meter drains; a guard that loses you searches the last place it saw you, then goes back to its patrol. Patience and timing beat speed.
- **Three floors.** The Grand Hall, The Vault, and The Rooftop Garden — more guards and tighter patrols on each. A relic is worth 100, a floor 200, and a floor cleared without ever being alerted earns a 150 ghost bonus.
- **Feel.** Footstep rings show where sound travels, the alarm sounds when a guard turns on you, and every sound is synthesised live in the browser — no audio files, no network, no build step. All art is drawn in code on a canvas.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build, no dependencies, no network: `game/index.html` and its ES modules play straight from the files. `M` mutes, `R` restarts the floor, Enter or Space advances the screens.

## Layout

- `game/index.html` — the page and canvas.
- `game/src/main.js` — boot, the fixed-step loop, and the screen state machine.
- `game/src/world.js` — the simulation: player, guards, detection, noise, pickups.
- `game/src/vision.js` — line of sight and the vision-cone test and shape.
- `game/src/levels.js` — the three museum floors as tile maps.
- `game/src/render.js` — all canvas drawing: floor, cover, cones, guards, HUD.
- `game/src/input.js` — keyboard and click-to-move.
- `game/src/audio.js` — WebAudio-synthesised footsteps, chimes, and alarms.
- `game/src/shots.js` — the screenshot scenes behind `?shot=` (an autopilot plays the real rules forward to stage each frame).
- `game/src/config.js`, `game/src/random.js` — tuning, palette, and the seeded RNG.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `serve.ts` — the tiny local static server.

<sub>Entered on [make.fun](https://make.fun/?ref=2wgaefze&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
