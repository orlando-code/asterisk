/**
 * Parse the Links column DSL into structured edges and parent references.
 * Identifiers are matched against Short title (see resolveShortTitle).
 */

const CHILD_RE = /^child\s*\(\s*(.+?)\s*\)\s*$/i;
const DEPENDENCY_RE = /^(.+?)\s+DEPENDENCY\s+(.+)$/i;
const BOTH_RE = /^(.+?)\s+BOTH\s+(.+)$/i;
const TO_GROUP_RE = /^(.+?)\s+TO\s+\(\s*(.+?)\s*\)\s*$/i;
const TO_SINGLE_RE = /^(.+?)\s+TO\s+(.+)$/i;

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function splitLinkStatements(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  return text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {string} groupInner e.g. "Clouds↑↓ & IRIS"
 */
function parseTargetList(groupInner) {
  return groupInner
    .split("&")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @typedef {{ type: 'dependency'|'reliant'|'thematic', source: string, target: string, undirected?: boolean }} ParsedEdge
 * @typedef {{ parentShortTitle: string }} ParsedParent
 */

/**
 * @param {string} statement
 * @returns {{ edges: ParsedEdge[], parent: ParsedParent | null, error?: string }}
 */
export function parseLinkStatement(statement) {
  const edges = [];
  let parent = null;

  const childMatch = statement.match(CHILD_RE);
  if (childMatch) {
    parent = { parentShortTitle: childMatch[1].trim() };
    return { edges, parent };
  }

  const depMatch = statement.match(DEPENDENCY_RE);
  if (depMatch) {
    edges.push({
      type: "dependency",
      source: depMatch[1].trim(),
      target: depMatch[2].trim(),
    });
    return { edges, parent };
  }

  const bothMatch = statement.match(BOTH_RE);
  if (bothMatch) {
    edges.push({
      type: "thematic",
      source: bothMatch[1].trim(),
      target: bothMatch[2].trim(),
      undirected: true,
    });
    return { edges, parent };
  }

  const toGroup = statement.match(TO_GROUP_RE);
  if (toGroup) {
    const source = toGroup[1].trim();
    for (const target of parseTargetList(toGroup[2])) {
      edges.push({ type: "reliant", source, target });
    }
    return { edges, parent };
  }

  const toSingle = statement.match(TO_SINGLE_RE);
  if (toSingle) {
    edges.push({
      type: "reliant",
      source: toSingle[1].trim(),
      target: toSingle[2].trim(),
    });
    return { edges, parent };
  }

  return { edges, parent, error: `Unrecognised link syntax: ${statement}` };
}

/**
 * @param {string} linksCell
 */
export function parseLinksCell(linksCell) {
  const edges = [];
  const parents = [];
  const errors = [];

  for (const statement of splitLinkStatements(linksCell)) {
    const result = parseLinkStatement(statement);
    if (result.error) errors.push(result.error);
    if (result.parent) parents.push(result.parent);
    edges.push(...result.edges);
  }

  return { edges, parents, errors };
}

/**
 * @param {string} name
 * @param {Map<string, string>} shortTitleByNormalised
 */
export function resolveShortTitle(name, shortTitleByNormalised) {
  const key = normaliseTitleKey(name);
  const resolved = shortTitleByNormalised.get(key);
  if (resolved) return { id: resolved, error: null };
  return { id: null, error: `Unknown short title in Links: "${name}"` };
}

export function normaliseTitleKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
