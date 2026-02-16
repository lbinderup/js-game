# js-game

Three.js scaffold for a block-mining management game prototype.

## What this scaffold includes

- Randomized 2D layer of mineable blocks (dirt/stone/iron/gold) with material-based health.
- Click + drag selection to mark blocks for mining.
- Miner NPC agents that automatically claim marked blocks, path to them, and mine over time.
- Miner progression with strength/speed stats and level-up points gained from hits + mined blocks.
- Basic UI panels for HUD, miner inspection, and a stat screen with **LEVEL UP** button.
- Modular project structure (`world`, `agents`, `systems`, `ui`, `core`) to keep responsibilities separated.

## Run locally

Because this is plain ES modules, you can use any static server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

> A `package.json` for a Vite workflow is included, but this environment may not allow npm registry access.
