# Asterisk project network

Interactive D3 graph of Asterisk Labs projects and internal repos. Data lives in [`data/raw.csv`](data/raw.csv); edit the CSV and refresh the dev server to update the view.

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
  - `A DEPENDENCY B` – technical dependency (dashed, directed).
  - `A TO B` or `A TO (B & C)` – one-way reliance (solid, directed).
  - `A BOTH B` – thematic / mutual (`:` dash, markers both ends).
- **Images**: `Image path` is a filename under `assets/` (e.g. `taco.svg`). Currently not used.
- **Timeline**: optional column `Start date` (`YYYY-MM-DD`). Without it, timeline mode places all nodes in the “undated” column.

## Stack

Vite + D3 v7 + Papa Parse. Interaction patterns (selection dimming, zoom, drag) follow the same ideas as `explore-icrs-2026/js/network.js`.
