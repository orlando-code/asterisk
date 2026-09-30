import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGraphFromCsv } from "../src/load-data.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const csvPath = join(root, "data", "raw.csv");
const csv = readFileSync(csvPath, "utf8");
const { nodes, edges, warnings } = buildGraphFromCsv(csv);

let failed = false;
for (const w of warnings) {
  console.warn("warning:", w);
}
if (!nodes.length) {
  console.error("No nodes parsed.");
  failed = true;
}
console.log(`OK: ${nodes.length} nodes, ${edges.length} edges`);
if (failed) process.exit(1);
if (warnings.length) process.exit(0);
