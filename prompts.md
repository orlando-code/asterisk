# Initial repo set-up and concept sketch

I want to visualise the network of projects facilitated by Asterisk Labs. /data/raw.csv contains various regular fields defining those projects, including basic tags e.g. duration (months) and fundamental relationships e.g. `Project A TO Project B`, `Project A BOTH Project B` (see section: 'Edge types').

### Purpose/audience
Polished and mutable (by adjusting csv) internal company planning/visualisation/stock-take, such that it could easily be modified to be launched online at the main company's GitHub repository. 

The goal is to see what project(s) are linked to which e.g. as parent-child or thematic relationships; how many/which are internal vs outward-facing; what's active/complete/proposed.

### Functionality
- Parent/child groupings, directed links, undirected thematic links
- Optionally split (via toggle) internal vs outward-facing. Toggling checkboxes should grey out the irrelevant nodes/edges/arrows
- Visualise different status by colour
- Search by title/short title/tags/key words (in description); recolour nodes by attribute

### Graph structure
Nodes are internal repos or 'project' rows (expecting maximum dozens); connections should be via edges with direction as stated in the 'Links' column. I may add additional deliverables which are children of the project e.g. papers, online visualisations, other deliverables.

Nodes should be interactively coloured by e.g. status, duration, `public`, language. Every node should have fixed attributes from the csv.

#### Edge types
Nodes can have multiple connections with others. Each edge type should have a different style as specified
- Technical dependency – `Project A DEPENDENCY Project B` – "--"
- Reliant – `Project A TO (Project B & Project C)` (one-way) – "-"
- Thematic/feedback – `Project A BOTH Project B` (two-way) – ":"

#### Graph layout
Three modes:
1. Network (default) – force-directed nodes
2. By theme – cluster or compound regions specified by overlapping regions where multiple tags
3. Timeline – horizontal axis by start date, ordered from left to right. Separate box for nodes with no date information.

### Visualisation

#### Stack
Use Javascript D3-style code to build the network, using the same interaction schema and panel/background formatting as in /Users/rt582/Desktop/explore-icrs-2026/js/network.js

#### Hosting
For now, keep hosting local and for Desktop (don;t worry about mobile). It's only a demo.

#### Aesthetics
- Use a colourmap based on assets/asterisk_logo.png
- 60% horizontal space is (responsive zoom/pan) graph; (20%) search/visualisation menu on left; (20%) panel on right which appears when node is selected with the full node details, disappears when no node yet selected, or when node deselected (by clicking background). 'ASTERISK' is title banner over top 10% vertical.
- When node selected, grey out others (and the relevant edges/arrows) (decrease opacity).
- Display with short title on graph; long title on hover.
- Nodes should be sized by degree (number of connections with others).
- Node images (linked `assets` files with paths specified in csv) should be superposed behind the nodes themselves. Files should be kept as svgs where necessary.
- Search by title/tag possible.
- Group isolated points together.

### Agent deliverables
- Flag ambiguities
- Scaffold repo, viewer, README
- Concise code: inline commends for non-obvious syntax/parsing and top-of-file/function docstrings