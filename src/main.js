import { loadGraph } from "./load-data.js";
import { createNetworkView } from "./network-view.js";
import { escapeHtml } from "./encode.js";

const state = {
  colorBy: "status",
  layoutMode: "network",
  showProject: true,
  showInternal: true,
};

function renderDetail(node) {
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");
  if (!panel || !content) return;

  if (!node) {
    panel.hidden = true;
    content.innerHTML = "";
    return;
  }

  panel.hidden = false;
  const tags = node.tags.length
    ? `<ul class="tag-list">${node.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : '<p class="muted">No tags</p>';

  content.innerHTML = `
    <h2 class="detail-title">${escapeHtml(node.title)}</h2>
    <p class="detail-short">${escapeHtml(node.shortTitle)}</p>
    <dl class="detail-grid">
      <dt>Status</dt><dd>${escapeHtml(node.status)}</dd>
      <dt>Category</dt><dd>${escapeHtml(node.category)}</dd>
      <dt>Public</dt><dd>${node.public ? "Yes" : "No"}</dd>
      <dt>Duration</dt><dd>${node.durationMonths != null ? `${node.durationMonths} months` : "—"}</dd>
      <dt>Start date</dt><dd>${node.startDate ? escapeHtml(node.startDate) : "—"}</dd>
      <dt>Language</dt><dd>${node.language ? escapeHtml(node.language) : "—"}</dd>
      <dt>Collaborators</dt><dd>${node.collaborators ? escapeHtml(node.collaborators) : "—"}</dd>
      <dt>Tags</dt><dd>${tags}</dd>
      <dt>Description</dt><dd>${node.description ? escapeHtml(node.description) : "—"}</dd>
      ${
        node.url
          ? `<dt>URL</dt><dd><a href="${escapeHtml(node.url)}" target="_blank" rel="noopener">${escapeHtml(node.url)}</a></dd>`
          : ""
      }
    </dl>
  `;
}

async function main() {
  const root = document.getElementById("graph-root");
  if (!root) return;

  const graph = await loadGraph();
  const warningsEl = document.getElementById("data-warnings");
  if (warningsEl && graph.warnings.length) {
    warningsEl.hidden = false;
    warningsEl.textContent = graph.warnings.join(" · ");
  }

  const view = createNetworkView(
    root,
    graph,
    {
      onSelect: renderDetail,
      getState: () => state,
    }
  );

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    view.setSearch(e.target.value);
  });

  document.getElementById("color-by")?.addEventListener("change", (e) => {
    state.colorBy = e.target.value;
    view.render();
  });

  document.getElementById("layout-mode")?.addEventListener("change", (e) => {
    state.layoutMode = e.target.value;
    view.render();
  });

  document.getElementById("filter-project")?.addEventListener("change", (e) => {
    state.showProject = e.target.checked;
    view.render();
  });

  document.getElementById("filter-internal")?.addEventListener("change", (e) => {
    state.showInternal = e.target.checked;
    view.render();
  });

  document.getElementById("detail-close")?.addEventListener("click", () => {
    view.selectNode(null);
  });

  window.addEventListener("resize", () => view.resize());
}

main().catch((err) => {
  console.error(err);
  const root = document.getElementById("graph-root");
  if (root) root.textContent = `Failed to load graph: ${err.message}`;
});
