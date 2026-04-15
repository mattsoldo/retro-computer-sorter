# Retro Computer Sorter — PRD

## Goal
A short-burst arcade game that teaches place value (ones through millions) to a 7–9 year-old learning level. The player steers falling retro-tech "spec blocks" into the correct place value bin at the bottom of the screen. Every falling object is a real piece of computing history with a real spec and a Wikimedia Commons photo.

## Who it's for
A 13-year-old with a 7–9 year-old learning level who is smart but dislikes classroom worksheets. The game must feel like a real arcade game, never homework. Every piece of UI — the title, the blinking "PRESS ENTER TO PLAY", the scanline overlay, the chip-tune sound effects — signals "arcade".

## Player loop
1. A number appears prominently at the top of the screen (e.g. `65,536 bytes RAM — Commodore 64 (1982)`) alongside a photo of the device.
2. A block containing that number falls from the top of a 7-lane canvas.
3. The player uses `←` / `→` to steer the block into the matching place value bin. **Bins are ordered largest-left → smallest-right** (mirroring standard positional notation: millions at left, ones at right).
4. `↓` fast-drops. Landing in the right bin awards points (with a combo bonus) and reveals a fun factoid. Landing in the wrong bin costs a life and plays a "wah-wah" sound.
5. 3 lives. Every 8 correct drops unlocks an additional tier of bins (from 4 → 6 → 7 bins). Every 10 correct drops bumps the level, which slightly accelerates falling speed.

## Place-value bins
Ones, Tens, Hundreds, Thousands, Ten-Thousands, Hundred-Thousands, Millions.

Unlock tiers:
- **Tier 0 (start):** ones, tens, hundreds, thousands (4 bins)
- **Tier 1 (+8 correct):** ten-thousands, hundred-thousands (6 bins total)
- **Tier 2 (+16 correct):** millions (7 bins total)

## Content
45 real retro-computing objects spanning all 7 place value bins. Categories: CPUs (transistor counts), home computers (RAM bytes), game cartridges (ROM bytes), arcade cabinets (max scores), monitors/graphics cards (color counts and resolutions), and input devices (button counts). Each object has:
- A real, historically accurate spec
- A fun factoid shown after a correct drop
- A Wikimedia Commons photo displayed in the spec panel while the block falls

Objects cover iconic hardware: Magnavox Odyssey, Atari 2600, Commodore 64, NES, Game Boy, ZX Spectrum, Amiga 500, Macintosh, IBM PC XT, Space Invaders, Pac-Man, Donkey Kong, and many more.

## Scoring
- Base: 100 points per correct drop
- Combo multiplier: +50 per consecutive correct (combo breaks on any wrong drop)

## Audio
Web Audio API square / saw / triangle tones — no assets. Ascending chime for correct, descending "wah-wah" for wrong, multi-note fanfare for combo milestones and unlocks.

## Accessibility
- Full keyboard controls
- `aria-live` polite region on the big spec panel announces the active number
- Scanline overlay uses `pointer-events: none` so it can't block input
- High contrast phosphor green / amber / red colour palette

## Non-goals
- No multiplayer
- No accounts — high scores are `localStorage` only (with ten preloaded retro-legend entries to set the tone)
- No decimals — integers only for the first version
