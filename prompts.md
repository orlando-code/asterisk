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

# Network interactivity and aesthetics

### Node manipulation
- Nodes should be closer together, and less repulsive
- Dragging one node should only move that node and any connected: currently others are drifting when an unrelated node is dragged (due to the sim still running on drag in bindDrag)
- After dragging, nodes should be pinned in new position

### Timeline view
Nodes should be spaced proportional to the time in between them, rather than evenly ie. Jan 2020 at far left, big space until 2024, then nodes closer in time. Stagger rows to reduce overlap if necessary. Undated nodes should appear in a side column.
Indicate the timeline itself via a thin horizontal line with any marked month e.g. Jan-2020 marked if there is a node there e.g. Jan-2020 then nothing marked until e.g. Jan-2024, Feb-2024 etc. The timeline should span from the first date and end with an arrow towards the right indicating the future.

### Node aesthetics
Arrows on the end of edges should have their tips touching the outer rim of the nodes: currently they are within the nodes.
Nodes should not escape the default view frame.

### Language tags
There should be a set of checkboxes for each of the represented languages. Selecting any combination of these buttons should highlight the nodes which have these language(s). All selected by default, with 'clear all'/'select all' buttons
