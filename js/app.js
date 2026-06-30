'use strict';

// ─── STATE ─────────────────────────────────────────────────────────
let topics = [];
let activeCategory = 'all';
let previousView = 'home';

// ─── INIT ───────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('data/topics.json');
    topics = await res.json();
  } catch (e) {
    console.error('Failed to load topics:', e);
    topics = [];
  }
  renderHomeGrid();
}

document.addEventListener('DOMContentLoaded', init);

// ─── VIEWS ─────────────────────────────────────────────────────────
function showHome() {
  hide('allTopicsView'); hide('topicDetailView'); hide('aboutView'); hide('searchView');
  show('homeView');
  resetSearch();
  document.getElementById('globalSearch').value = '';
  activeCategory = 'all';
  renderHomeGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAllTopics() {
  previousView = 'home';
  hide('homeView'); hide('topicDetailView'); hide('aboutView'); hide('searchView');
  show('allTopicsView');
  activeCategory = 'all';
  setActivePill(document.querySelector('#allTopicsView .pill'));
  renderGrid('allTopicGrid', topics);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAbout() {
  hide('homeView'); hide('allTopicsView'); hide('topicDetailView'); hide('searchView');
  show('aboutView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (previousView === 'all') showAllTopics();
  else showHome();
}

function showTopic(id) {
  const topic = topics.find(t => t.id === id);
  if (!topic) return;

  const el = document.getElementById('topicDetailView');
  document.getElementById('topicDetailContent').innerHTML = buildTopicDetail(topic);

  const currentlyVisible = !document.getElementById('allTopicsView').style.display ||
    document.getElementById('allTopicsView').style.display !== 'none';
  previousView = document.getElementById('allTopicsView').style.display !== 'none' ? 'all' : 'home';

  hide('homeView'); hide('allTopicsView'); hide('aboutView'); hide('searchView');
  show('topicDetailView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── RENDER ─────────────────────────────────────────────────────────
function renderHomeGrid() {
  renderGrid('topicGrid', topics);
}

function renderGrid(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = activeCategory === 'all'
    ? items
    : items.filter(t => t.category === activeCategory);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="no-results">
      <div class="nr-icon">🔍</div>
      <h3>No topics found</h3>
      <p>Try a different category or search term</p>
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(buildCard).join('');
}

function buildCard(topic) {
  const diffClass = 'diff-' + topic.difficulty.replace(/\s+/g, '');
  const tags = topic.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('');
  const catLabel = topic.category.charAt(0).toUpperCase() + topic.category.slice(1);

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
    </div>
  `;
}

function buildTopicDetail(topic) {
  const diffClass = 'diff-' + topic.difficulty.replace(/\s+/g, '');
  const catLabel = topic.category.charAt(0).toUpperCase() + topic.category.slice(1);
  const keyTopicsHtml = topic.keyTopics.map(k => `<li>${k}</li>`).join('');
  const tagsHtml = topic.tags.map(t => `<span class="tag">${t}</span>`).join('');

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
        <ul class="key-topics-list">
          ${keyTopicsHtml}
        </ul>
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

        <div class="cta-box">
          <h3>📂 Original Source Materials</h3>
          <p>The full set of ${topic.fileCount} reference documents for this module is available in the GitHub repository.</p>
          <a href="https://github.com/search?q=marineeng-academy" class="btn-primary" style="display:inline-block;margin-top:4px" target="_blank" rel="noopener">View on GitHub →</a>
          <p class="cta-note">Files include PDFs, work instructions, and PowerPoint presentations in Japanese from active vessel operations.</p>
        </div>
      </div>
    </div>
  `;
}

// ─── CATEGORY FILTER ────────────────────────────────────────────────
function filterCategory(cat, btn) {
  activeCategory = cat;

  // update pills in whichever section is active
  const containers = btn.closest('.category-pills').querySelectorAll('.pill');
  containers.forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  // update the correct grid
  const allTopicsVisible = document.getElementById('allTopicsView').style.display !== 'none';
  if (allTopicsVisible) {
    renderGrid('allTopicGrid', topics);
  } else {
    renderGrid('topicGrid', topics);
    scrollToSection('categories');
  }
}

function setActivePill(pill) {
  if (!pill) return;
  pill.closest('.category-pills').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
}

// ─── SEARCH ─────────────────────────────────────────────────────────
let searchTimeout;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => doSearch(query.trim()), 200);
}

function doSearch(query) {
  if (!query) {
    resetSearch();
    return;
  }

  const q = query.toLowerCase();
  const results = topics.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.summary.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.keyTopics.some(k => k.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q)
  );

  hide('homeView'); hide('allTopicsView'); hide('topicDetailView'); hide('aboutView');
  show('searchView');
  document.getElementById('searchResultTitle').textContent = `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`;
  const grid = document.getElementById('searchResultGrid');
  activeCategory = 'all';
  if (results.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <div class="nr-icon">🔍</div>
      <h3>No results for "${query}"</h3>
      <p>Try searching for a system name, like "boiler", "DG", or "fire"</p>
    </div>`;
  } else {
    grid.innerHTML = results.map(buildCard).join('');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetSearch() {
  hide('searchView');
  show('homeView');
}

// ─── UTILS ─────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
