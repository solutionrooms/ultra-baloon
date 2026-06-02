# Ultra Balloon — Product Requirements (PRD)

> A faithful web remake of **"The Mad Balloon"** (internal name *"Krazy Balloon"*),
> a 1998 Palm OS game of skill and nerve by **Julian Scott**.
> Working title for the web version: **Ultra Balloon** (repo `ultra-baloon`).

## 1. Background & heritage

The source material is a Palm OS application shipped in `balloon.zip`:

| Item | Value |
|------|-------|
| Database name | `The Mad Balloon` |
| Internal/menu name | `Krazy Balloon` |
| Author | Julian Scott (© 1998) |
| Platform | Palm OS, Motorola 68k |
| Creator ID / type | `MaBa` / `appl` |
| This build | v1.0 (README documents up to v1.2) |
| Size | ~48 KB PRC (47 KB is the single `code` resource) |

This is a **shareware** build: the README states the unregistered version is
**limited to 1 main level + the bonus level**. We will faithfully reproduce that
one level now and add the remaining 9 levels if/when a registered PRC is sourced.

The original draws its graphics **programmatically** (no sprite/level asset
tables), so we are recovering level geometry and physics by **reverse-engineering
the 68k code** — see `plan.md`.

## 2. Goals

- Recreate the **signature feel**: a balloon that perpetually **swings like a
  pendulum**, demanding nerve and timing to thread through a maze.
- Be **faithful** to level 1's exact geometry, hazards, timings and scoring, as
  recovered from the ROM.
- Run great on **desktop (keyboard) and mobile (touch)** in any modern browser.
- Reuse the proven **landitar** stack and conventions (TypeScript + Vite +
  Canvas 2D, GitHub Pages deploy).
- Honour the original's authorship and retro Palm aesthetic.

## 3. Non-goals (for v1)

- ❌ Multiplayer (single-player only; architect so it *could* be added later).
- ❌ All 10 levels (blocked on a registered ROM — only level 1 + bonus now).
- ❌ Pixel-perfect emulation of Palm OS UI chrome; we recreate the *game*, not the PDA.
- ❌ Monetisation / registration flow.

## 4. Target platforms & controls

- **Desktop**: keyboard, remappable (mirrors the original's remappable keys).
- **Mobile/tablet**: on-screen touch buttons; responsive, scalable canvas.
- Default key map (from the original):

  | Action | Original | Web default |
  |--------|----------|-------------|
  | Move left | O | ← / A |
  | Move right | O | → / D |
  | Thrust up | ↑ | ↑ / W |
  | (Down) | ↓ | ↓ / S |
  | Slow-mo (fine-tune) | O | Shift |
  | Pause | O | P / Esc |

  *(Exact movement model — buoyancy vs. thrust vs. the automatic swing — is
  confirmed during RE; see §5.1.)*

## 5. Core gameplay

**Loop:** guide the swinging balloon from spawn → through the maze → to the
**GOAL**, optionally collecting flags **A** then **B** for bonus and the bonus
room, before the level timer drains. Faster = more bonus.

### 5.1 Balloon physics — the signature mechanic
- The balloon **continually swings side-to-side** ("has a life of its own").
- Difficulty (Easy/Medium/Hard) alters **swing speed/amplitude**.
- **Slow-mo** key fine-tunes movement for precise threading.
- Exact model (pendulum amplitude, buoyancy, thrust response, gravity) to be
  pinned down from the ROM and captured as constants in `extracted/physics.json`.

### 5.2 Flags, goal & bonus room
- Each level has flag **A** (500 pts) and flag **B** (1000 pts).
- Collect **A then B in order**, then reach the GOAL → enter the **bonus room**
  ("masses of points").
- On some levels, collecting **A spawns a nasty spiky ball**; collecting **B**
  makes it disappear.

### 5.3 Hazards
- **Moving scenery** (shifting walls/obstacles).
- **Dripping pipes** (falling drops).
- **Splat launchers** (projectiles).
- **Darts**.
- **Mr. Blower**: if the player stays **stationary too long**, he appears and
  blows the balloon into a wall — i.e. an **anti-idle** mechanic. Very dangerous.
- **Spiky ball** (see §5.2).

### 5.4 Level timer & scoring
- Per-level timer starts at **1000** and counts down; remaining time → end-of-level
  bonus.
- Flag A = **500**, Flag B = **1000**.
- Bonus room and diamonds (bonus level) award escalating points.
- **Extra life every 10,000 points.**

### 5.5 Lives, difficulty, progression
- Lose a life on fatal collision (terrain/hazard).
- **Easy / Medium / Hard** = balloon swing speed.
- 10 levels total (registered); complete all 10 → loop to level 1 at higher
  difficulty.
- **Level select** from the options screen: any previously-reached level.

### 5.6 Bonus level
- A **survival** stage entered after a flagged level.
- Survive as long as possible; **collect diamonds** (each subsequent diamond
  worth more); dodge **bouncing nasties**.

## 6. Screens / UX
- **Title** — branding (credit Julian Scott), Start, Options, High Scores, About.
- **Options** — difficulty, start level (unlocked only), key remapping, sound.
- **Game** — maze, balloon, HUD (score, lives, level timer, flags A/B collected).
- **Bonus room / bonus level** — as above.
- **Game over** — score, high-score entry.
- **High scores** — local table (consider the original's flavour names later).
- **About** — heritage / credits.

## 7. Persistence (localStorage)
- High scores (`ultra-balloon-highscores`).
- Key bindings & settings (`ultra-balloon-preferences`).
- Highest level reached / unlocked (`ultra-balloon-progress`).

## 8. Audio
- Web Audio SFX: swing/thrust, flag pickup, diamond, hazard hit, death, extra
  life, Mr. Blower. Faithful-retro bleeps; mute toggle. (Original sounds may be
  sampled during RE if time-effects exist.)

## 9. Visual style
- Retro **monochrome / Palm-grayscale** aesthetic (Palm IIIx had 4-level gray),
  rendered crisply on Canvas 2D and scaled to viewport. Faithful to the original's
  abstract, geometric look while remaining sharp on modern high-DPI displays.

## 10. Fidelity strategy
- **Reverse-engineer** the 68k `code` resource to extract:
  1. Level 1 geometry (walls, flags, goal, hazard placements & types).
  2. Physics constants (swing, gravity/buoyancy, thrust, slow-mo factor).
  3. Timings (level timer rate, Mr. Blower idle threshold, hazard cadences).
  4. Scoring constants.
- Persist findings as committed JSON under `src/data/extracted/` (mirrors how
  landitar commits extracted Gravitar vectors).
- Validate against the original running in a Palm OS emulator (POSE / Mu) where
  feasible.

## 11. Success criteria
- Level 1 is **recognisably the original**: same maze, flags, goal, hazards, and
  the swing *feels* right.
- Playable end-to-end (title → level 1 → bonus → game over → high score) on
  desktop **and** mobile.
- Deployed and reachable on GitHub Pages.
- Clean enough architecture to drop in levels 2–10 from a future registered ROM
  by adding data files only.

## 12. Risks & open questions
- **RE depth**: exact physics/geometry may be laborious to recover; fallback is
  emulator-observed reconstruction of the *feel* if byte-exact proves impractical.
- **Registered ROM availability**: levels 2–10 depend on sourcing it (user is
  looking). v1 ships 1 level + bonus regardless.
- **Movement model ambiguity**: precise role of up/down/left/right vs. the
  automatic swing is unconfirmed until RE (§5.1).
- **Bonus room contents**: README mentions it exists but not its exact layout —
  recover from ROM or design faithfully.
