import { loadGraph } from "./load-data.js";
import { createNetworkView } from "./network-view.js";
import { escapeHtml } from "./encode.js";
import { collectLanguages, linguistColor } from "./languages.js";

const state = {
  colorBy: "status",
  layoutMode: "network",
  showProject: true,
  showInternal: true,
  showDistribution: true,
  selectedLanguages: new Set(),
  languageCount: 0,
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
      <dt>Duration</dt><dd>${node.durationMonths != null ? `${node.durationMonths} months` : "–"}</dd>
      <dt>Start date</dt><dd>${node.startDate ? escapeHtml(node.startDate) : "–"}</dd>
      <dt>Language</dt><dd>${node.language ? escapeHtml(node.language) : "–"}</dd>
      <dt>Collaborators</dt><dd>${node.collaborators ? escapeHtml(node.collaborators) : "–"}</dd>
      <dt>Tags</dt><dd>${tags}</dd>
      <dt>Description</dt><dd>${node.description ? escapeHtml(node.description) : "–"}</dd>
      ${
        node.url
          ? `<dt>URL</dt><dd><a href="${escapeHtml(node.url)}" target="_blank" rel="noopener">${escapeHtml(node.url)}</a></dd>`
          : ""
      }
    </dl>
  `;
}

function setupLanguageFilters(graph, view) {
  const langs = collectLanguages(graph.nodes);
  state.languageCount = langs.length;
  state.selectedLanguages = new Set(langs);

  const fieldset = document.getElementById("language-fieldset");
  const container = document.getElementById("language-filters");
  if (!fieldset || !container) return;

  if (!langs.length) {
    fieldset.hidden = true;
    return;
  }

  fieldset.hidden = false;
  container.innerHTML = langs
    .map(
      (lang) => `
    <label class="lang-check">
      <input type="checkbox" data-lang="${escapeHtml(lang)}" checked />
      <span class="lang-dot" style="background:${linguistColor(lang)}"></span>
      ${escapeHtml(lang)}
    </label>`
    )
    .join("");

  const syncFromDom = () => {
    const boxes = container.querySelectorAll('input[type="checkbox"][data-lang]');
    state.selectedLanguages = new Set(
      [...boxes].filter((b) => b.checked).map((b) => b.getAttribute("data-lang"))
    );
    view.refreshFilters();
  };

  container.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"][data-lang]')) syncFromDom();
  });

  document.getElementById("lang-select-all")?.addEventListener("click", () => {
    container.querySelectorAll('input[type="checkbox"][data-lang]').forEach((b) => {
      b.checked = true;
    });
    syncFromDom();
  });

  document.getElementById("lang-clear-all")?.addEventListener("click", () => {
    container.querySelectorAll('input[type="checkbox"][data-lang]').forEach((b) => {
      b.checked = false;
    });
    syncFromDom();
  });
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

  const view = createNetworkView(root, graph, {
    onSelect: renderDetail,
    getState: () => state,
  });

  setupLanguageFilters(graph, view);

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    view.setSearch(e.target.value);
  });

  document.getElementById("color-by")?.addEventListener("change", (e) => {
    state.colorBy = e.target.value;
    view.render();
  });

  document.getElementById("layout-mode")?.addEventListener("change", (e) => {
    state.layoutMode = e.target.value;
    for (const n of graph.nodes) {
      n._userPinned = false;
    }
    view.render();
  });

  document.getElementById("filter-project")?.addEventListener("change", (e) => {
    state.showProject = e.target.checked;
    view.refreshFilters();
  });

  document.getElementById("filter-internal")?.addEventListener("change", (e) => {
    state.showInternal = e.target.checked;
    view.refreshFilters();
  });

  document.getElementById("filter-distribution")?.addEventListener("change", (e) => {
    state.showDistribution = e.target.checked;
    view.refreshFilters();
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
