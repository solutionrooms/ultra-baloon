# CLAUDE.md

## Must-do rules
- **Never push to production unless explicitly asked.** Commit locally; wait for "push" / "deploy".
- **Never amend commits** — always create new ones.

## Project overview
**Ultra Balloon** is a browser remake of **"The Mad Balloon" / "Krazy Balloon"** (Julian Scott, 1998,
Palm OS). A balloon perpetually swings like a pendulum; you thread a maze to the GOAL, collect flags
A→B for a bonus room, dodge hazards and Mr. Blower. Built with TypeScript + Vite, HTML5 Canvas 2D,
deployed to GitHub Pages. Single-player. Desktop keyboard + mobile touch.

- **Repo**: `solutionrooms/ultra-baloon`
- **Live**: https://solutionrooms.github.io/ultra-baloon/
- **Deploy**: GitHub Actions on push to `main` (`.github/workflows/deploy.yml`).
- **Source ROM**: `balloon_rom/BALLOON.PRC`; reverse-engineering notes in `re/`.

## Tech stack
- TypeScript (strict), no framework
- Vite (`base: '/ultra-baloon/'`)
- Canvas 2D rendering (virtual resolution, scaled to viewport)
- localStorage for high scores, key prefs, progress, settings

## Commands
- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run typecheck` — `tsc --noEmit`

## Architecture (`src/`)
```
main.ts            — entry, fixed-timestep loop, scene stack
core/    input.ts, preferences.ts, settings.ts, audio.ts, highscores.ts, storage.ts, rng.ts
math/    vec2.ts, collision.ts
render/  renderer.ts (camera + virtual-res scaling), colors.ts, hud.ts, sprites.ts
levels/  level-data.ts (types + loader), level1.ts, maze.ts (collision)
entities/ balloon.ts, flag.ts, goal.ts, spiky-ball.ts, mr-blower.ts, diamond.ts,
          hazards/{moving-wall,pipe,launcher,dart,bouncer}.ts
scenes/  scene.ts, title, options, game, bonus-room, bonus-level, game-over, high-scores, about
data/extracted/  physics.json, scoring.json, icon.json, ui.json,
                 levels.json (all 10 levels' objects), maze0..9.json (byte-exact wall masks)
```
`tools/mpf_decompress.py` is a small 68k interpreter that executes the ROM's real MPF decompressor
to extract the byte-exact maze wall masks.

## Fidelity
Extracted ROM data lives in `src/data/extracted/` (see `re/FINDINGS.md` for what was recovered vs.
inferred). Physics/scoring constants come from there; level geometry is faithful-by-design where the
binary didn't expose it. Levels 2–10 require a registered ROM.
