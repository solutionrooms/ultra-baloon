# Ultra Balloon — Implementation Plan

Companion to [`lander_prd.md`](./lander_prd.md). Recreate **"The Mad Balloon" /
"Krazy Balloon"** (Julian Scott, 1998) as a browser game, reusing the
[`landitar`](../landitar) stack and conventions.

## Guiding conventions (inherited from landitar)
- **Never push to production unless explicitly asked.** Commit locally only.
- **Never amend commits** — always create new ones.
- Stack: **TypeScript (strict) + Vite + Canvas 2D**, no framework. localStorage
  for persistence. Deploy to **GitHub Pages** via GitHub Actions.
- Extracted ROM data is **committed JSON** under `src/data/extracted/`.

## Toolchain (verified available on this machine)
- `node` v20, `npm` v10 ✓
- `python3` 3.9 ✓ (add `capstone` via `pip install capstone` for scripted m68k analysis)
- `m68k-elf-objdump` ✓ — disassembles the raw `code` resource
- `brew` ✓ (for POSE/Mu emulator or extra tooling if needed)

---

## Phase 0 — Reverse-engineer the ROM  *(in progress)*

**Goal:** recover level 1 geometry, physics constants, timings, scoring.

- [x] Parse PRC, dump all 10 resources → `re/resources/` (script: see below).
- [x] Confirm 68k disassembly pipeline (`m68k-elf-objdump -D -b binary -m m68k:68000`).
- [ ] Build a **Palm OS trap table** (`re/traps.ts|json`, from CoreTraps.h) to map
      `trap #15` selectors (`a08f`, `a090`, …) → API names (WinDrawLine,
      WinFillRectangle, WinDrawBitmap, EvtGetEvent, KeyCurrentState, …).
- [ ] Annotate the disassembly; locate the **draw/render loop** and the
      **event/input loop**.
- [ ] Identify the **level-1 data table** (wall rects/lines, flag A/B positions,
      goal, hazard placements + types). Likely a static array referenced by the
      draw routine.
- [ ] Recover **physics constants** (swing amplitude/period, gravity/buoyancy,
      thrust, slow-mo factor) and **timings** (timer rate, Mr. Blower idle
      threshold, hazard cadences) and **scoring** constants.
- [ ] Write findings to `re/FINDINGS.md` and emit machine-readable data:
      - `src/data/extracted/level1.json`
      - `src/data/extracted/physics.json`
      - `src/data/extracted/scoring.json`
- [ ] (Optional) Run original in **POSE/Mu** to screenshot level 1 and validate
      the recovered geometry/feel.

**Tooling to add** under `tools/`:
- `tools/extract-prc.ts` — parse PRC, split resources (port of the recon script).
- `tools/disasm.ts` / `re/*.py` — drive objdump/capstone, apply trap names.
- `tools/extract-level.ts` — pull recovered level/physics tables → `extracted/*.json`.

> **Fallback:** if byte-exact geometry proves impractical, reconstruct level 1
> faithfully from emulator screenshots + README, and treat recovered constants as
> the source of truth for *feel*.

## Phase 1 — Project scaffold
- [ ] `npm init` → Vite + TS strict, mirroring landitar's `package.json`,
      `tsconfig.json`, `vite.config.ts` (`base: '/ultra-baloon/'`), `index.html`
      (canvas + fullscreen button), `.gitignore`.
- [ ] `git init`; add `CLAUDE.md` with the conventions above + architecture map.
- [ ] Source skeleton (landitar-style):
  ```
  src/
    main.ts                 — entry, game loop, scene stack
    core/        input.ts, preferences.ts, settings.ts, audio.ts, highscores.ts, storage.ts
    entities/    balloon.ts, flag.ts, goal.ts, spiky-ball.ts,
                 mr-blower.ts, hazards/{pipe,launcher,dart,mover}.ts, diamond.ts
    levels/      level-data.ts (interface + loader), maze.ts (collision)
    math/        vec2.ts, collision.ts
    render/      renderer.ts, hud.ts, colors.ts
    scenes/      title, options, game, bonus-room, bonus-level, game-over, high-scores, about
    data/extracted/  level1.json, physics.json, scoring.json
  ```

## Phase 2 — Core physics & rendering
- [ ] Fixed-timestep game loop + scene stack (port landitar's pattern).
- [ ] Canvas renderer with world→screen scaling, responsive/high-DPI, letterboxed.
- [ ] **Balloon pendulum physics** from `physics.json`; thrust + slow-mo.
- [ ] **Maze collision** (balloon vs. walls) from `level1.json`.
- [ ] Camera/viewport for larger-than-screen mazes.

## Phase 3 — Level 1 & mechanics
- [ ] Render level 1 maze, balloon, flags A/B, goal.
- [ ] Flag ordering (A→B), bonus-room unlock, **spiky ball** spawn/despawn.
- [ ] Hazards: moving scenery, dripping pipes, splat launchers, darts.
- [ ] **Mr. Blower** idle-timer behaviour.
- [ ] Level timer (1000 countdown) + end-of-level time bonus.
- [ ] Scoring, lives, **extra life @ 10,000**, death/respawn.
- [ ] HUD (score, lives, timer, flags collected).

## Phase 4 — Bonus content
- [ ] **Bonus room** (post-flagged-level reward).
- [ ] **Bonus level** (survival; escalating diamonds; bouncing nasties).

## Phase 5 — Shell, input, persistence, audio
- [ ] Title / Options / Game-over / High-scores / About scenes.
- [ ] Difficulty (Easy/Med/Hard swing speed), level select (unlocked only).
- [ ] Keyboard + **on-screen touch controls**; remappable keys.
- [ ] localStorage: high scores, key prefs, progress, settings.
- [ ] Web Audio SFX (swing/thrust, pickup, diamond, hit, death, extra life, Blower).

## Phase 6 — Polish & deploy
- [ ] Mobile responsiveness pass; fullscreen; pause-on-blur.
- [ ] Title/credits honouring Julian Scott; retro Palm-grayscale aesthetic.
- [ ] `.github/workflows/deploy.yml` → GitHub Pages (port from landitar).
- [ ] Create repo `solutionrooms/ultra-baloon`; deploy. *(push only when asked)*

## Future (post-registered-ROM)
- [ ] Extract levels 2–10 → `extracted/levelN.json` (data-only additions).
- [ ] Difficulty loop (all 10 done → restart harder).
- [ ] Optional: level editor / debug viewer (cf. landitar's level-debug scene).
- [ ] Optional: PeerJS multiplayer (architecture already kept clean for it).

---

## Milestones
1. **M0 — RE recovered**: `level1.json` + `physics.json` committed, validated.
2. **M1 — Swing demo**: balloon swings & threads a hand-loaded maze on canvas.
3. **M2 — Level 1 complete**: all mechanics, scoring, win/lose end-to-end.
4. **M3 — Full game shell**: bonus level, screens, touch, persistence, audio.
5. **M4 — Shipped**: deployed to GitHub Pages, mobile-tested.

## Status snapshot (built)
- **Phase 0 (RE) — done.** `re/FINDINGS.md` documents byte-exact recovery: 10-level descriptor
  table @0x7b88, Level-1 object coords (start 64,103 / goal 68,147 / flag A 45,46 / flag B 73,62),
  scoring/timer (timer starts **999**), the direct-thrust move model, and the 32×32 app icon.
  Notable: the pendulum-swing sine code shipped **disabled** in v1.0 (dead), so the swing here is a
  manual-faithful reconstruction; level walls are a compressed `MPF` bitmap (located, not yet
  decompressed) so Level 1's maze is reconstructed around the recovered landmarks.
- **Phases 1–6 — done.** Full game built on the landitar stack: balloon-with-basket player, Mr.
  Blower profile face, brick-textured monochrome walls, flags/goal, bonus room + survival level,
  title/options/high-scores/about/key-remap, touch controls, audio, pause→quit, high-score entry.
- Adversarial multi-agent review run (16 findings) and all fixed (timer rate, WASD double-fire,
  resize realloc, scene-race guard, touch soft-lock, corrupted-storage guards, HUD spacing, …).
- Verified in-browser: title → play → swing/collide/scroll → reach goal → next lap → pause/quit.
- **Future:** decompress the `MPF` maze for byte-exact walls; add levels 2–10 from a registered ROM.
