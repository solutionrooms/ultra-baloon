# The Mad Balloon / "Krazy Balloon" — Reverse-Engineering FINDINGS

Source: `/Users/jonscott/Projects/ultra_baloon/re/resources/`
Primary artifact: `code_1.bin` (47350 bytes, 68k code + data). Disassembled with
`m68k-elf-objdump -D -b binary -m m68k:68000 re/resources/code_1.bin`.
All offsets below are **file offsets into `code_1.bin`** (objdump `-b binary`, base 0) unless noted otherwise. `a5@(N)` = an a5-relative global; the global block is 2698 bytes (`0x0A8A`).

Throughout: **RECOVERED** = read directly from bytes / verified disassembly. **INFERENCE** = reasoned interpretation. **TUNED** = a playable default chosen by us where the binary gives no value.

---

## 1. Rendering model

**Conclusion (high confidence, RECOVERED): a hand-coded direct-framebuffer engine with double buffering. The game uses NO Palm OS Window-manager drawing trap.** Of the entire Win\* graphics range, only `WinGetDisplayWindow` (0xa200) is called, exactly once (at 0x1732), to obtain the screen base pointer; all pixels are then written directly to memory by custom 68k blitters.

### 1.1 Trap usage (RECOVERED)
44 real trap call sites / 33 unique selectors, all in the genuine code region 0x10–0x37d2. (Counted by adjacency: a `.short 0xaXXX` word only counts when it immediately follows a real `trap #15` = opcode `0x4e4f`. Naive grep over the data tables yields spurious hits and was excluded.) Notable:

| Selector | API | Sites |
|---|---|---|
| 0xa200 | **WinGetDisplayWindow** (only Win\* call) | 0x1732 |
| 0xa11d | EvtGetEvent | 0x78 |
| 0xa0a9 | SysHandleEvent | 0xc0 |
| 0xa17a / 0xa171 / 0xa16f / 0xa174 / 0xa173 | FrmHandleEvent / FrmDrawForm / FrmInitForm / FrmSetActiveForm / FrmGetActiveForm | 0xf0 / 0x15c / 0x124 / 0x12e / 0xe6,0x156 |
| 0xa19b / 0xa192 | FrmGotoForm / FrmAlert | 0x68 / 0x196,0x11fe,0x1212 |
| 0xa0f7 | TimGetTicks (frame pacing) | 0x1baa,0x1c72,0x1ca8 |
| 0xa0a0 | SysTaskDelay | 0x3e6,0x490 |
| 0xa0c2 | SysRandom | 0x12ba |
| 0xa233 / 0xa234 | SndDoCmd / SndPlaySystemSound | 0x3720,0x376a,0x37d2 / 0x20 |
| 0xa22f / 0xa22e | PrefSet/GetAppPreferencesV10 | 0x184e,0x18bc / 0x18da |
| 0xa27b | FtrGet ('psys',2 = ROM version check) | 0x24c,0x288 |
| Dm\*/Mem\* family | database + buffer alloc | 0x1116–0x1246 |
| 0xa03c / 0xa03d | MemSemaphoreReserve/Release (guard direct screen writes) | 0x1788 / 0x1794 |

`KeyCurrentState` (0xa18f) is **NOT** called via trap. Input keycodes come from `EvtGetEvent` keyDownEvents; raw held-key state is read from Palm low-memory global `0x188` directly in the input routine (0x1662).

### 1.2 Geometry & buffers (RECOVERED)
- **Logical play field: 160×160 at 2 bits/pixel** (4-gray). Row stride **rowBytes = 40** (every rasterizer computes `y*40`, columns via `>>4` 16-px words). Clip rect `a5@(242..248)` = L0/T0/R159/B159 set at 0x352/0x35c.
- Corroborated by the "Greyscale Palette" menu option and by collision sampling at 1bpp (pixel test at 0x4802: `lsrw #4` → word column, `andw #15` → bit) — the **low bitplane is the wall/solid mask**, the high plane is shading.
- **Variant clip bottoms:** B=143 at 0x1c4c (144-tall bonus room), B=399 at 0x1eb6 (400-tall scrolling buffer for the survival/diamond bonus level).
- **Buffers:** A 36864-byte (0x9000) DB record (`DmNewRecord` 0x117a, `MemHandleLock` 0x1192) is carved into: scratch `a5@(250)` `[0..6400)`, decompressed-maze buffer `a5@(156)` `[6400..22400)`, master sprite sheet `a5@(2526)` `[22400..36864)`. A separate `MemPtrNew` block (0x11e6) is the primary draw buffer `a5@(152)`. On failure: `FrmAlert(1001)` (Memory Error) + `SysReset`.
- **Vertical scrolling.** Camera function at 0x20c4: `cameraY = clamp(balloonY − 72, 0, mazeHeight − 144)` stored at `a5@(224)`; balloon held ~72 px from the top of the 144-px play window. Top **16 px** (160−144) is the status/score bar.

### 1.3 Custom rasterizers (RECOVERED)
- **0x6c8** — clipped sprite/pattern blitter (AND/OR masks via 16-entry lookup tables at PC-rel 0x632 and 0x5f2).
- **0x76c** — line/rectangle filler (pattern register D7, edge masks, `0x55555555`).
- Glyph/score-digit blitters at 0x7d8, 0x8f8, 0xabe, 0xc6a, 0xdfa, 0xf3a, 0xf94, 0xff4, 0x104e, 0x1072, 0x10ca. **Text/score digits are drawn by these custom glyph blitters, not WinDrawChars.** The font itself is a glyph-bitmap table at file region 0x4a00–~0x6b00 (124 records × 68 bytes; each `0x00000108` header + 8 rows of mask+16-bit bitmap).
- **Present/flip path:** 0x173e–0x1782 `blitToScreen()` deinterleaves the 2bpp buffer (`andl #0x55555555` / `#0xAAAAAAAA`) into device screen layout; 0x17a4 fast `moveml` 40-byte/row copy; 0x1eb0 pointer-swap buffer flip.
- The framebuffer base is also written to the MC68328 ("Dragonball") LCD **LSSA register 0xFFFFFA00** at 0x3c2 (INFERENCE that the engine drives the LCD controller directly in addition to the WinGetDisplayWindow pointer).

### 1.4 Main loop & state machine (RECOVERED)
- Event loop 0x58–0x108; `FrmGotoForm(1000)` at 0x68. keyDownEvent (type 4) handled at 0x7e: hardware app buttons (vchr 0x204–0x207) and page up/down (0x0B/0x0C).
- Form dispatcher 0x142: on frmOpenEvent → `FrmDrawForm` then game-init chain `jsr 0x23a → jsr 0x2fc → jsr 0x325e`; on menuEvent handles item 1001 via `FrmAlert(1000)`.
- Game state machine at 0x325e (switch on `a5@(460)`, cases 0–10).
- Per-frame update+render core ~0x1ba4–0x1ec0: `TimGetTicks` → input/step `jsr 0x165c` → subsystem updates (0x2682,0x2482,0x1fd4,0x2696,0x2512,0x2bca) → blit/flip.

### 1.5 Sound (RECOVERED)
- `SndDoCmd` (0xa233) is the primary engine (3 sites). Sound code 0x36e4–0x37de writes Dragonball sound registers 0xFFFFF500/F502/F504; uses 4,000,000 Hz clock divisor (0x37a0), command duration 10000 (0x37b2) and amplitude 64 (0x37b8). Sound on/off flag `a5@(332)`.
- `SndPlaySystemSound` (0xa234, arg #3) at 0x20 sits in the launch-code guard near `SysAppStartup`; recovered but this single mapping is the lowest-certainty one.
- In-game sound IDs observed: flag A = 9, flag B = 10, extra life = 11, spiky-ball spawn = 14, goal = 18.

---

## 2. Level data

**Verdict: object geometry (goal, both flags, balloon start, hazards, conditional spawns) IS FULLY RECOVERED as exact integer coordinates for all 10 levels. Wall maze pixels are structurally identified and located but NOT expanded (they are compressed). There is NO wall-rectangle / line-endpoint table — that hypothesis is disproved.**

### 2.1 Level descriptor table (RECOVERED) — file offset 0x7b88
Table of 10 big-endian u16 offsets; each is added to the table base to reach a per-level descriptor. Runtime selection at 0x1dfc–0x1e04 (`lea %pc@(0x7b88)`). Level index lives at `a5@(454)`; start-level option at `a5@(456)`.

Verified raw bytes at 0x7b88: `0014 0304 062e 09d0 0cd6 11f2 18e8 1da8 25c4 2bee` → descriptor addresses
L0=0x7b9c, L1=0x7e8c, L2=0x81b6, L3=0x8558, L4=0x885e, L5=0x8d7a, L6=0x9470, L7=0x9930, L8=0xa14c, L9=0xa776.
The next word after the 10 entries is `00a0` (= 160, level-0 width) — confirming exactly **10 levels**.

**Descriptor struct (field-by-field, RECOVERED):**
| Off | Type | Meaning |
|---|---|---|
| +0 | u16 | maze width = 160 (all levels) |
| +2 | u16 | maze height in rows (200/300/400) |
| +4 | u16 | balloon START X (read 0x1f2c) |
| +6 | u16 | balloon START Y (read 0x1f38) |
| +8 | u16 | conditional-spawn X (0xFFFF = none) |
| +10 | u16 | conditional-spawn Y |
| +12 | u32 | byte offset (rel. to descriptor) to object/hazard list (read 0x1e52) |
| +20 | — | the `"MPF\x01"` maze bitmap |

Heights: L0–L1 = 200 rows (8000 B), L2–L5 = 300 (12000 B), L6–L9 = 400 (16000 B).

### 2.2 Object / hazard placement list (RECOVERED)
Array of **8-byte entries**, terminated by sentinel word **0x270F (9999)** (checked at 0x1e56). Entry: `+0 u16 X`, `+2 u16 Y`, `+4 u8 type`, `+5 u8 subtype`, `+6 u16 param`. Spawn-by-type 0x2d5c; remove-all-of-type 0x2d32.

Object type semantics (handlers 0x2e1a–0x3258; collision dispatch 0x2c68):
- **type 2 = GOAL** (sprite 23) → end level, sound 18.
- **type 3 = FLAG** (0x2cba): subtype 0 = Flag A (+500, sound 9, state `a5@(2530)`); subtype 2 = Flag B (+1000, sound 10, state `a5@(2531)`). Flag B triggers the conditional spawn. Flag A spawns the spiky ball (type 14, `0x2ce0` calls remove/spawn `0x2d32`/`0x2d5c`); Flag B removes it.
- **type 4 = bonus diamond** (0x2c84): awards `a5@(2484)`, +40 each pickup (escalating).
- type 1 = mover; type 5 = hazard (sprite 31); type 7 = launcher/dart (timing param); type 9 = phased hazard (sprite 34); type 12 = sprite-43 object.

Validation: every level has exactly **one type-2 goal + one Flag A (subtype 0) + one Flag B (subtype 2)** — matches the manual.

### 2.3 LEVEL 1 — fully recovered (verified this synthesis pass)
Descriptor 0x7e8c raw: `00a0 00c8 0040 0067 ffff ffff 00000310` → width 160, height 200, start (64,103), conditional spawn = none, list offset +0x310 = **0x819c**.
Object list at 0x819c (verified raw): `0044 0093 0200 0000 / 0049 003e 0302 0000 / 002d 002e 0300 0000 / 270f`:
- **GOAL (68, 147)**
- **Flag B / 1000 (73, 62)**
- **Flag A / 500 (45, 46)**
- sentinel 0x270F. Level 1 has no extra hazards.

(Levels 0 and 2–9 decode identically and deterministically from the offsets above. Example L0: start (109,172), conditional spawn (87,53), GOAL (31,52), Flag B (83,75), Flag A (135,83), one type-5 hazard at (9,133).)

### 2.4 Maze walls — located, NOT expanded (HONEST)
Walls are a per-level compressed monochrome bitmap, container magic **`"MPF\x01"`** (`4D 50 46 01`), validated at 0x38e4 (`cmpl #0x4D504601`). Header: `magic(4) | uncompressedSize(u32) | compressedSize(u32)`. Decompressor at **0x38d2** (LZ77 + canonical-Huffman, reads compressed data backwards in 16-bit big-endian units; helpers 0x3a10–0x3aff). Each level's bitmap is at `descriptor+20`.

14 MPF blocks tile end-to-end from 0x6c3a. Maze blocks: L0=0x7bb0, **L1=0x7ea0** (8000 B → 160×200), L2=0x81ca, L3=0x856c, L4=0x8872, L5=0x8d8e, L6=0x9484, L7=0x9944, L8=0xa160, L9=0xa78a. Block 0 (0x6c3a) is the master sprite/title sheet; block 12 (0xaf2a) is the bonus sheet.

The compressed bytes are present and dimensions are recovered, but a bit-exact port of the backward Huffman bit-reader was **not completed**, so actual wall pixels were not extracted. Medium-high confidence a faithful port yields clean 160×H 2bpp bitmaps (low plane = collision mask). **We do not fabricate the maze; `level1.json` is therefore omitted and `levelGeometryRecoverable=false`.** Note: object geometry for L1 *is* fully recovered — only the wall raster is pending.

---

## 3. Physics / timing / scoring constants

### 3.1 Scoring (high confidence, RECOVERED)
AddScore routine at 0x2b4e.
| Constant | Value | Address |
|---|---|---|
| Extra-life threshold | 10000 (0x2710) | 0x2b56 / 0x2b60 (cmp/sub on accumulator `a5@(446)`; +1 life `a5@(480)`, sound 11) |
| Flag A score | 500 (0x1f4) | 0x2cf2 |
| Flag B score | 1000 (0x3e8) | 0x2cc8 |
| Diamond base | 100 (0x64) | 0x1dd0 (`a5@(2484)` init each level) |
| Diamond increment | +40 (0x28) | 0x2c94 (so 100,140,180,220,…) |
| Starting lives | 3 | 0x1d68 (`a5@(480)`); score `a5@(450)` cleared 0x1d58 |
| High-score table | 10 × 8 bytes at `a5@(2578)` | insertion sort 0x3e90 |

A second escalating bonus-level award gives 1 or 5 points (threshold-20 test at 0x2566) and subtracts from the timer `a5@(504)` at 0x2570.

### 3.2 Level timer (RECOVERED — corrects the manual)
- **Start = 999** (0x3E7), not 1000: `movew #999,%a5@(504)` at 0x1e22. (Manual rounds the display to 1000.)
- **Decrement: once every 4 frames** (0x24ca `andw #3` then `subqw #1` at 0x24d0; clamps at 0).
- Disambiguation: the `#1000` immediates at 0x64/0x192 are resource ID 1000 (form/menu), and the `#1000` at 0x2cc8 is the Flag B score — none is the timer.

### 3.3 Frame pacing (RECOVERED)
Busy-wait at 0x1c72 (`TimGetTicks`; target = last + `a5@(492)`). Frame delay `a5@(492)` set at 0x388 from the "smooth" option `a5@(236)`: smooth → **4 ticks/frame** (`#4` at 0x37a), else **0** (uncapped). Palm `SysTicksPerSecond = 100` (documented OS constant, not in this binary) → smooth ≈ **25 fps**; with the timer dropping every 4 frames, one timer unit ≈ 0.16 s, so 999 units ≈ ~160 s/level (INFERENCE on the 100 ticks/s constant).

### 3.4 Balloon movement (RECOVERED — notable)
Balloon entity `a5@(916)`, position in 16.16 fixed point, **start (80,80)** (0x1dc4/0x1dca). Update at 0x1fd4 reads logical action bits `a5@(204)`:
- LEFT/RIGHT → `dx = ∓65536` (∓1.0 px); UP/DOWN → `dy = ∓65536`; applied at 0x2066/0x206a.
- **Slow Motion (bit 4): halves both deltas (`asrl #1`) → 0.5 px/frame** (0x2062).
- **No per-frame gravity / buoyancy / thrust force is applied** — movement is pure direct ±1px 8-directional thrust. (RECOVERED; significant — see fidelity note.)

### 3.5 Pendulum swing (RECOVERED — important honesty finding)
A complete sin/cos + 2D rotation routine exists at **0x339e** (caller 0x3388), using a 1024-step angle and a sine table referenced at `a5@(132)`. **BUT: 0x3388 has zero callers (exhaustively verified), the sine table is never written nor present as literal data, and no quarter/full sine table matches anywhere in the binary.** Therefore the perpetual pendulum swing is **NOT implemented as a sine oscillator in this shipped build** — the trig/rotation path shipped disabled/dead. The visible side-to-side motion in the real binary is produced by the generic ping-pong scenery oscillators (below), or the feature was disabled at ship time.

### 3.6 Oscillators / motion helpers (RECOVERED)
- Ping-pong oscillator pattern at 0x3cba/0x4736: value `a5@(510)` bounces between `a5@(512)` and `a5@(514)`; speeds set to **2, 4, 5, 8** at 0x3366/0x32d4/0x32f8/0x3380.
- Homing ease = 1/8 (`asrl #3`, 0x26ee). Random wander = ±2 (`divuw #5` then −2, 0x270c).

### 3.7 Difficulty (medium confidence)
Option strings "Easy"/"Medium"/"Hard" recovered (0x424e/0x4253/0x425a) alongside "Difficulty", "Start Level Num", "Sound", "Greyscale Palette", "Remap game buttons", "Enter registration code", "Reset high scores", "Reset defaults". A single difficulty global feeding swing speed could **not** be isolated (because the swing/sine code is dead). The most likely live speed lever is the frame-delay `a5@(492)` (4 vs 0 ticks). The manual's "Easy/Med/Hard alters swing speed" is plausible but unproven in code.

### 3.8 Mr. Blower idle threshold — NOT FOUND (honest negative)
No `cmp` of an input-reset idle counter against a constant was located. Free-running counters `a5@(496)`/`a5@(506)` exist but no idle-spawn threshold. Likely data-driven per level. No value fabricated.

### 3.9 Input / collision / entities (RECOVERED)
- Input edge-detect 0x1662–0x1730 reads low-mem `0x188`; remaps physical→logical via 8-entry table `a5@(308)` into held/pressed/released globals `a5@(204/208/212/216)`. Logical bits: 0=Up,1=Down,2=Left,3=Right,4=SlowMo,5=Pause (toggle `a5@(474)`).
- Balloon hitbox at 0x2be6: x∈[x−4,x+4], y∈[y−10,y+3]. Per-type box table at 0x2ba2 (type2 ±8/±4, type3 ±5/±5, type4 ±5/±5).
- 32 main entities × 40 B at `a5@(934)`; 8 secondary × 40 B at `a5@(2214)`. Entity: +0 active, +1 type, +2 x word, +6 y(16.16), +19 sprite/frame, +26 flags, +27 subtype, +28 behavior fn-ptr. 4-frame animation (`a5@(496)` `lsr #2 & 3`).
- RNG wrapper 0x12b0 (`SysRandom` → `a5@(168)`), 17 call sites.

---

## 4. UI / icon (all RECOVERED)

### 4.1 App icon — `tAIB_1000.bin`
BitmapType header (verified): width **32**, height **32**, rowBytes **4**, flags 0 (uncompressed, 1-bit mono). Pixel data bytes 0x10–0x8F (128 B). Decoded MSB-first (1=black): a **balloon (top-right rounded blob with a trailing string)**, a small motif/lettering at the left, and a **solid baseline across row 21**; rows 22–31 blank. Pixel array supplied in `icon.json` (re-decoded directly from bytes this pass, byte-exact).

### 4.2 Menu — `MBAR_1000.bin` (id 1000)
1 pull-down menu titled **"Options"** with 2 items:
| Item | Command ID | Hotkey | Label |
|---|---|---|---|
| 1 | 1001 (0x3E9) | A | About Krazy Balloon |
| 2 | 1002 (0x3EA) | R | Restart |
(Title-bar rect x6 y14 w121 h22 at 0x24.)

### 4.3 Form — `tFRM_1000.bin` (id 1000)
Window bounds 160×160 (full screen); form ID 1000; **title "Krazy Balloon"**. No labeled controls beyond the title — gameplay is rendered programmatically.

### 4.4 Alerts
- `Talt_1000` (id 1000, 1 button): title **About Krazy Balloon**, body **"This is Krazy Balloon,"** (literal trailing comma), button **Yup!**
- `Talt_1001` (id 1001, 1 button): title **Memory Error**, body **Unable to allocate memory**, button **Reset**

### 4.5 Version & names
- `tver_1`: **"1.0"** (`31 2e 30 00`).
- Internal DB / creator name **"The Mad Balloon"** (creator ID `'MaBa'` = 0x4D616261); user-facing title **"Krazy Balloon"**. `data_0.bin` also contains "TempDb".
- `pref_1.bin` (10 B): `001e 0000 8000 0000 8000` — saved prefs (the `0x8000`s look like packed flag/high-score sentinels; `0x1e`=30 a default counter). INFERENCE.

---

## 5. Fidelity assessment (honest)

**High confidence / RECOVERED (cite-backed, byte-exact):**
- Rendering = custom 2bpp 160-wide (rowBytes 40) double-buffered framebuffer; only WinGetDisplayWindow used; full trap map (44 sites).
- All scoring constants, lives, timer (999), frame pacing, balloon move step + slow-mo factor, entity/collision layout, RNG.
- All UI text, menu, alerts, version, icon bitmap (32×32×1bpp, decoded byte-exact).
- Level architecture: 10-level descriptor table at 0x7b88, descriptor struct, object/hazard list format, and **exact object coordinates for all 10 levels including Level 1** (goal/flags/start verified this pass).

**Located but NOT extracted (honest gap):**
- Maze **wall pixels** — compressed `"MPF\x01"` per level; decompressor at 0x38d2 located but not ported. No wall coordinate table exists; walls are raster bitmaps. `level1.json` deliberately omitted.

**Notable corrections to the brief/manual:**
1. Timer starts at **999**, not 1000.
2. The pendulum swing is **not** a live sine oscillator in this build — the trig routine is dead code with no sine table; visible motion comes from scenery oscillators (speeds 2/4/5/8) or a disabled path.
3. There is **no gravity/buoyancy/thrust force** — the balloon moves by direct ±1px thrust (×½ in slow-mo) only.
4. Mr. Blower idle threshold **not found** as a constant (likely data-driven); not fabricated.
5. Two distinct 0x2710 literals: extra-life threshold (0x2b56) vs. sound duration (0x37b2) — only the former is the extra-life value.

Because of (2) and (3), the `physics.json` swing/gravity/buoyancy/thrust values are explicitly labelled **inferred** or **tuned** playable defaults; only the move step, slow-mo factor and start position are **recovered**.

---

## 6. Maze decompression — SOLVED (update)

The MPF (LZ77 + canonical-Huffman, backward 16-bit reader) decompressor was ported by
**executing the actual 68k bytes** of functions 0x38d2/0x3a10/0x3a46/0x3a52/0x3a6a/0x3a76 in a
small faithful interpreter (`tools/mpf_decompress.py`). Validation: **all 10 levels decode to
exactly their uncompressed size** (8000/12000/16000 bytes) and the routine returns `usize`.

**Bitplane layout (recovered):** each decompressed row is 40 bytes = 20-byte **low plane (the
1bpp wall/collision mask, MSB = leftmost pixel, 1 = wall)** + 20-byte shading plane. Borders read
as solid wall; interiors show the original diagonal-slope mazes. Wall densities 0.35–0.55.

The 1bpp wall masks for all 10 levels are emitted to `src/data/extracted/maze{0..9}.json` (base64),
and the byte-exact object lists to `src/data/extracted/levels.json`. The game now loads all 10
real levels: walls via greedy rectangle decomposition of the mask; goal/flagA/flagB at their exact
recovered coordinates; the conditional-spawn field drives the flag-A spiky ball; object types
5/12→static nasty, 9→oscillating nasty, 7→launcher, 1→moving wall (behaviours inferred, positions
byte-exact). **Levels 2–10 did not require a registered ROM — all 10 levels' data lives in the
unregistered BALLOON.PRC.**
