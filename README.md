# Asterisk project network

Interactive graph of [Asterisk Labs projects/repos](https://github.com/asterisk-labs).

## Icons
Child icons courtesy of Icons8:
- <a target="_blank" href="https://icons8.com/icon/lOqoeP2Zy02f/google-colab">Google Colab</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
- <a target="_blank" href="https://icons8.com/icon/RvmjJZghUFKa/paper">Paper</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
- <a target="_blank" href="https://icons8.com/icon/3685/globe">Globe</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
- <a target="_blank" href="https://icons8.com/icon/37325/youtube-play">Youtube Play</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>

## Quick start

```bash
npm install
npm run validate   # optional: check Links DSL and short titles
npm run dev
```

Build static files:

```bash
npm run build
npm run preview
```

## Editing data

- **Node id**: `Short title` (must be unique).
- **Links** (on each row, `;`-separated):
  - `child(A)` – associated material (faint solid, undirected)
  - `A DEPENDENCY B` – technical dependency (dashed, directed).
  - `A TO B` or `A TO (B & C)` – one-way reliance (solid, directed).
  - `A BOTH B` – thematic / mutual (`:` dash, markers both ends).
- **Timeline**: optional column `Start date` (`YYYY-MM-DD`). Timeline mode places all nodes without this date in the “undated” column.
- **Images**: `Image path` is a filename under `assets/` (e.g. `taco.svg`). Currently not used.

## Stack

Follows `explore-icrs-2026/js/network.js`: Vite + D3 v7 + Papa Parse.
