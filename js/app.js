'use strict';

const REPO_URL = 'https://github.com/AIinterruptor/marineeng-academy';

// ─── STATE ──────────────────────────────────────────────────────────
let topics = [];
let activeCategory = 'all';
let previousView = 'home';   // 'home' | 'all' | 'search'
let lastSearchQuery = '';    // remembered so goBack from detail → search re-populates grid

// ─── INIT ────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('data/topics.json');
    topics = await res.json();
  } catch (e) {
    console.error('Failed to load topics:', e);
    topics = [];
  }
  renderGrid('topicGrid', topics);
  setActivePillsInView('homeView', 'all');
}

document.addEventListener('DOMContentLoaded', init);

// ─── VIEWS ───────────────────────────────────────────────────────────
function showHome() {
  hideAll();
  show('homeView');
  document.getElementById('globalSearch').value = '';
  lastSearchQuery = '';
  activeCategory = 'all';
  setActivePillsInView('homeView', 'all');
  renderGrid('topicGrid', topics);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAllTopics() {
  previousView = 'home';
  hideAll();
  show('allTopicsView');
  activeCategory = 'all';
  setActivePillsInView('allTopicsView', 'all');
  renderGrid('allTopicGrid', topics);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAbout() {
  hideAll();
  show('aboutView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (previousView === 'all') {
    // go back to All Topics, preserve last category filter
    hideAll();
    show('allTopicsView');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (previousView === 'search') {
    // restore search view and re-render results
    hideAll();
    show('searchView');
    if (lastSearchQuery) renderSearchResults(lastSearchQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    showHome();
  }
}

function showTopic(id) {
  const topic = topics.find(t => t.id === id);
  if (!topic) return;

  // capture origin BEFORE hiding anything
  if (isVisible('allTopicsView'))  previousView = 'all';
  else if (isVisible('searchView')) previousView = 'search';
  else                              previousView = 'home';

  document.getElementById('topicDetailContent').innerHTML = buildTopicDetail(topic);
  hideAll();
  show('topicDetailView');
  renderRelated(topic);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── RENDER ──────────────────────────────────────────────────────────
function renderGrid(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = activeCategory === 'all'
    ? items
    : items.filter(t => t.category === activeCategory);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <div class="nr-icon">🔍</div>
        <h3>No topics in this category</h3>
        <p>Try "All" or a different filter</p>
      </div>`;
    return;
  }
  container.innerHTML = filtered.map(buildCard).join('');
}

function buildCard(topic) {
  const diffClass = 'diff-' + topic.difficulty.replace(/\s+/g, '');
  const tags = topic.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('');
  const catLabel = capitalize(topic.category);
  return `
    <div class="topic-card" onclick="showTopic('${topic.id}')">
      <div class="card-header">
        <div class="card-icon">${topic.icon}</div>
        <div class="card-title-area">
          <div class="card-title">${topic.title}</div>
          <div class="card-category">${catLabel}</div>
        </div>
      </div>
      <div class="card-summary">${topic.summary}</div>
      <div class="card-tags">${tags}</div>
      <div class="card-footer">
        <div class="card-meta">
          <span class="meta-item">📁 ${topic.fileCount} files</span>
          <span class="difficulty-badge ${diffClass}">${topic.difficulty}</span>
        </div>
        <span class="card-arrow">→</span>
      </div>
    </div>`;
}

function buildTopicDetail(topic) {
  const diffClass     = 'diff-' + topic.difficulty.replace(/\s+/g, '');
  const catLabel      = capitalize(topic.category);
  const keyTopicsHtml = topic.keyTopics.map(k => `<li>${k}</li>`).join('');
  const tagsHtml      = topic.tags.map(t => `<span class="tag">${t}</span>`).join('');

  // Drive link if available, else repo root
  const driveLink = topic.driveUrl || null;
  const repoLink  = REPO_URL;

  const filesBtn = driveLink
    ? `<a href="${driveLink}" class="btn-primary" style="display:inline-block;margin-top:8px" target="_blank" rel="noopener">📂 Open in Google Drive →</a>`
    : `<a href="${repoLink}" class="btn-primary" style="display:inline-block;margin-top:8px" target="_blank" rel="noopener">📂 View Repository →</a>`;

  return `
    <div class="detail-hero">
      <div class="detail-header">
        <div class="detail-icon">${topic.icon}</div>
        <div class="detail-title-area">
          <h1>${topic.title}</h1>
          <div class="detail-meta">
            <span class="detail-category">${catLabel}</span>
            <span class="difficulty-badge ${diffClass}">${topic.difficulty}</span>
            <span class="meta-item" style="font-size:0.82rem;color:var(--text3)">📁 ${topic.fileCount} reference files</span>
          </div>
        </div>
      </div>
      <p class="detail-summary">${topic.summary}</p>
    </div>

    <div class="detail-grid">
      <div class="detail-card">
        <h2>📌 Key Topics Covered</h2>
        <ul class="key-topics-list">${keyTopicsHtml}</ul>
      </div>
      <div>
        <div class="detail-card">
          <h2>ℹ️ Module Info</h2>
          <div class="info-rows">
            <div class="info-row">
              <span class="info-label">Category</span>
              <span class="info-value">${catLabel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Difficulty</span>
              <span class="difficulty-badge ${diffClass}" style="display:inline-block;margin-top:4px">${topic.difficulty}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Source Files</span>
              <span class="info-value">${topic.fileCount} documents</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tags</span>
              <div class="tag-list">${tagsHtml}</div>
            </div>
          </div>
        </div>

        <div class="cta-box" style="margin-top:14px">
          <h3>📂 Source Materials</h3>
          <p>Original reference documents — PDFs, work instructions, and manuals from active vessel operations.</p>
          ${filesBtn}
          <p class="cta-note">Materials are in Japanese. English summaries are provided on this page.</p>
        </div>

        <div class="cta-box" style="margin-top:14px">
          <h3>🔗 Related Topics</h3>
          <div id="related-${topic.id}" class="related-list"></div>
        </div>
      </div>
    </div>`;
}

function renderRelated(topic) {
  const container = document.getElementById(`related-${topic.id}`);
  if (!container) return;

  const related = topics
    .filter(t => t.id !== topic.id && (
      t.category === topic.category ||
      t.tags.some(tag => topic.tags.includes(tag))
    ))
    .slice(0, 4);

  if (related.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.82rem">No related topics found.</p>';
    return;
  }
  container.innerHTML = related.map(r => `
    <div class="related-item" onclick="showTopic('${r.id}')">
      <span class="related-icon">${r.icon}</span>
      <span class="related-title">${r.title}</span>
      <span class="related-arrow">→</span>
    </div>`).join('');
}

// ─── CATEGORY FILTER ────────────────────────────────────────────────
function filterCategory(cat, btn) {
  activeCategory = cat;
  btn.closest('.category-pills').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  if (isVisible('allTopicsView')) {
    renderGrid('allTopicGrid', topics);
  } else {
    renderGrid('topicGrid', topics);
    scrollToSection('categories');
  }
}

function setActivePillsInView(viewId, cat) {
  const view = document.getElementById(viewId);
  if (!view) return;
  view.querySelectorAll('.pill').forEach(p => {
    const m = p.getAttribute('onclick') && p.getAttribute('onclick').match(/filterCategory\('([^']+)'/);
    if (m) p.classList.toggle('active', m[1] === cat);
  });
}

// ─── SEARCH ─────────────────────────────────────────────────────────
let searchTimeout;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => doSearch(query.trim()), 200);
}

function doSearch(query) {
  if (!query) {
    clearSearch();
    return;
  }
  lastSearchQuery = query;

  // remember origin before switching to search
  if (!isVisible('searchView')) {
    if (isVisible('allTopicsView'))  previousView = 'all';
    else if (isVisible('homeView'))  previousView = 'home';
  }

  renderSearchResults(query);
  hideAll();
  show('searchView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSearchResults(query) {
  const q = query.toLowerCase();
  const results = topics.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.summary.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.keyTopics.some(k => k.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q)
  );

  document.getElementById('searchResultTitle').textContent =
    `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`;

  const grid = document.getElementById('searchResultGrid');
  if (results.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="nr-icon">🔍</div>
        <h3>No results for "${query}"</h3>
        <p>Try: "boiler", "DG", "fire", "pump", "exam", "LNG", "turbine"</p>
      </div>`;
  } else {
    grid.innerHTML = results.map(buildCard).join('');
  }
}

function clearSearch() {
  document.getElementById('globalSearch').value = '';
  lastSearchQuery = '';
  hideAll();
  if (previousView === 'all') show('allTopicsView');
  else show('homeView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── UTILS ───────────────────────────────────────────────────────────
const VIEWS = ['homeView', 'allTopicsView', 'topicDetailView', 'aboutView', 'searchView'];

function hideAll() {
  VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function isVisible(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  return el.style.display !== 'none';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
