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
  const keyTopicsHtml = topic.keyTopics.map((k, i) => `
    <li class="kt-item" onclick="toggleKeyTopic(this, '${escapeHtml(k)}')">
      <div class="kt-row">
        <span class="kt-label">${k}</span>
        <span class="kt-chevron">›</span>
      </div>
      <div class="kt-expand" id="kte-${topic.id}-${i}" style="display:none"></div>
    </li>`).join('');
  const tagsHtml      = topic.tags.map(t => `<span class="tag">${t}</span>`).join('');

  const driveLink = topic.driveUrl || null;
  const filesBtn = driveLink
    ? `<a href="${driveLink}" class="btn-primary" style="display:inline-block;margin-top:8px" target="_blank" rel="noopener">📂 Open in Google Drive →</a>`
    : `<a href="${REPO_URL}" class="btn-primary" style="display:inline-block;margin-top:8px" target="_blank" rel="noopener">📂 View Repository →</a>`;

  // External links section
  const extLinks = (topic.externalLinks || []);
  const ytLinks  = extLinks.filter(l => l.type === 'youtube');
  const wkLinks  = extLinks.filter(l => l.type === 'wikipedia');
  const refLinks = extLinks.filter(l => l.type === 'reference');

  const renderLinkGroup = (icon, label, links) => links.length === 0 ? '' : `
    <div class="ext-group">
      <div class="ext-group-label">${icon} ${label}</div>
      ${links.map(l => `<a href="${l.url}" class="ext-link" target="_blank" rel="noopener">${l.label} ↗</a>`).join('')}
    </div>`;

  const externalSection = extLinks.length === 0 ? '' : `
    <div class="cta-box" style="margin-top:14px">
      <h3>🌐 Learn More</h3>
      <p>Curated external resources — videos, Wikipedia articles, and engineering references.</p>
      <div class="ext-links-container">
        ${renderLinkGroup('▶️', 'YouTube Videos', ytLinks)}
        ${renderLinkGroup('📖', 'Wikipedia', wkLinks)}
        ${renderLinkGroup('🔗', 'Engineering References', refLinks)}
      </div>
    </div>`;

  const localImgHtml = topic.localImage
    ? `<div class="detail-local-img"><img src="${topic.localImage}" alt="${escapeHtml(topic.title)}" loading="lazy"></div>`
    : '';

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
      ${localImgHtml}
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

        ${externalSection}

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
    const safeQuery = escapeHtml(query);
    grid.innerHTML = `
      <div class="no-results">
        <div class="nr-icon">🔍</div>
        <h3>No results for "${safeQuery}"</h3>
        <p>Try: "boiler", "DG", "fire", "pump", "exam", "LNG", "turbine"</p>
      </div>`;
  } else {
    grid.innerHTML = results.map(buildCard).join('');
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
const VIEWS = ['homeView', 'allTopicsView', 'topicDetailView', 'aboutView', 'searchView', 'examView'];

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

// ─── MOBILE MENU ─────────────────────────────────────────────────
function toggleMenu() {
  const links = document.getElementById('navLinks');
  const btn = document.getElementById('navHamburger');
  const open = links.classList.toggle('nav-open');
  btn.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
}

function closeMenu() {
  const links = document.getElementById('navLinks');
  const btn = document.getElementById('navHamburger');
  links.classList.remove('nav-open');
  btn.classList.remove('is-open');
  btn.setAttribute('aria-expanded', 'false');
}

// ─── KEY TOPIC EXPAND (Wikipedia) ────────────────────────────────
const ktCache = {};

// Extract a short search term from a verbose key topic phrase
function wikiSearchTerm(phrase) {
  // Strip parenthetical notes, "and X" tails, verbs at start
  return phrase
    .replace(/\s*\([^)]*\)/g, '')          // remove (parentheses)
    .replace(/\s+(and|or|vs\.?|with|for|of|in|from|on|–|—).*$/i, '') // trim after connectors
    .replace(/^(Understanding|Preparation for|How to|Introduction to|Overview of)\s+/i, '')
    .trim();
}

async function wikiSummary(term) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation' || !data.extract) return null;
  return data;
}

async function toggleKeyTopic(li, query) {
  const panel = li.querySelector('.kt-expand');
  const chevron = li.querySelector('.kt-chevron');
  const isOpen = panel.style.display !== 'none';

  // close any other open panels
  document.querySelectorAll('.kt-item.kt-open').forEach(el => {
    if (el !== li) {
      el.querySelector('.kt-expand').style.display = 'none';
      el.classList.remove('kt-open');
      el.querySelector('.kt-chevron').textContent = '›';
    }
  });

  if (isOpen) {
    panel.style.display = 'none';
    li.classList.remove('kt-open');
    chevron.textContent = '›';
    return;
  }

  li.classList.add('kt-open');
  chevron.textContent = '⌄';
  panel.style.display = '';

  if (ktCache[query]) { panel.innerHTML = ktCache[query]; return; }

  panel.innerHTML = '<div class="kt-loading">Loading…</div>';

  try {
    const term = wikiSearchTerm(query);
    // Try progressively shorter terms until we get a hit
    const candidates = [
      term,
      term.split(' ').slice(0, 3).join(' '),
      term.split(' ').slice(0, 2).join(' '),
    ];

    let data = null;
    for (const candidate of candidates) {
      data = await wikiSummary(candidate);
      if (data) break;
    }

    let html = '';
    if (data) {
      const img = data.thumbnail
        ? `<img class="kt-img" src="${data.thumbnail.source}" alt="${escapeHtml(data.title)}" loading="lazy">`
        : '';
      const extract = data.extract.split('. ').slice(0, 3).join('. ').trim();
      const endPunct = extract.endsWith('.') ? '' : '.';
      const wikiLink = data.content_urls
        ? `<a href="${data.content_urls.desktop.page}" class="kt-wiki-link" target="_blank" rel="noopener">Read more on Wikipedia ↗</a>`
        : '';
      html = `<div class="kt-content">${img}<p class="kt-text">${escapeHtml(extract + endPunct)}</p>${wikiLink}</div>`;
    } else {
      const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(term)}`;
      html = `<div class="kt-no-result">No quick summary found. <a href="${searchUrl}" class="kt-wiki-link" target="_blank" rel="noopener">Search Wikipedia for "${escapeHtml(term)}" ↗</a></div>`;
    }
    ktCache[query] = html;
    panel.innerHTML = html;
  } catch (e) {
    panel.innerHTML = `<div class="kt-no-result">Could not load summary. Check your connection.</div>`;
  }
}

// ─── BOARD EXAM ──────────────────────────────────────────────────────
let examQuestions = [];
let examAnswers   = {};   // { questionId: 'A'|'B'|'C'|'D' }
let examSubmitted = false;

function dailyShuffle(arr) {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 2654435761) >> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function showExam() {
  previousView = isVisible('allTopicsView') ? 'all' : isVisible('searchView') ? 'search' : 'home';
  if (examQuestions.length === 0) {
    try {
      const res = await fetch('data/exam.json');
      const raw = await res.json();
      examQuestions = dailyShuffle(raw);
    } catch (e) {
      console.error('Failed to load exam:', e);
      return;
    }
  }
  examAnswers   = {};
  examSubmitted = false;
  hideAll();
  show('examView');
  renderExam();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitExam() {
  if (previousView === 'all') { hideAll(); show('allTopicsView'); }
  else if (previousView === 'search') { hideAll(); show('searchView'); if (lastSearchQuery) renderSearchResults(lastSearchQuery); }
  else { showHome(); }
}

function renderExam() {
  const el = document.getElementById('examContent');
  el.innerHTML = `
    <div class="exam-header">
      <h1>📋 MARINA Board Exam Practice</h1>
      <p class="exam-subtitle">100-item Marine Engineering Licensure Examination (Philippine MARINA standard)</p>
      <div class="exam-meta-row">
        <span class="exam-badge">100 Items</span>
        <span class="exam-badge">Multiple Choice</span>
        <span class="exam-badge">3AE – 2AE Level</span>
      </div>
    </div>
    <form id="examForm" onsubmit="submitExam(event)">
      ${examQuestions.map(q => buildQuestion(q)).join('')}
      <div class="exam-submit-row">
        <button type="submit" class="btn-primary exam-submit-btn">Submit Exam →</button>
      </div>
    </form>`;
}

function buildQuestion(q) {
  return `
    <div class="exam-question" id="eq-${q.id}">
      <div class="eq-number">Question ${q.id}</div>
      <div class="eq-text">${escapeHtml(q.question)}</div>
      <div class="eq-choices">
        ${q.choices.map(c => {
          const letter = c.charAt(0);
          return `
            <label class="eq-choice" id="eq-${q.id}-${letter}">
              <input type="radio" name="q${q.id}" value="${letter}" onchange="recordAnswer(${q.id}, '${letter}')">
              <span class="eq-choice-text">${escapeHtml(c)}</span>
            </label>`;
        }).join('')}
      </div>
      <div class="eq-explanation" id="ex-${q.id}" style="display:none"></div>
    </div>`;
}

function recordAnswer(qid, letter) {
  examAnswers[qid] = letter;
}

function submitExam(e) {
  e.preventDefault();
  if (examSubmitted) return;

  const unanswered = examQuestions.filter(q => !examAnswers[q.id]);
  if (unanswered.length > 0) {
    const confirmed = confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`);
    if (!confirmed) return;
  }

  examSubmitted = true;
  let correct = 0;

  examQuestions.forEach(q => {
    const selected = examAnswers[q.id];
    const isCorrect = selected === q.answer;
    if (isCorrect) correct++;

    const qEl = document.getElementById(`eq-${q.id}`);
    if (qEl) {
      qEl.classList.add(isCorrect ? 'eq-correct' : 'eq-wrong');
      // highlight choices
      q.choices.forEach(c => {
        const letter = c.charAt(0);
        const label = document.getElementById(`eq-${q.id}-${letter}`);
        if (!label) return;
        if (letter === q.answer) label.classList.add('eq-answer');
        if (letter === selected && !isCorrect) label.classList.add('eq-selected-wrong');
      });
      // show explanation
      const exEl = document.getElementById(`ex-${q.id}`);
      if (exEl) {
        exEl.style.display = '';
        exEl.innerHTML = `<strong>${isCorrect ? '✓ Correct' : '✗ Incorrect'}.</strong> ${escapeHtml(q.explanation || '')}`;
      }
    }
  });

  const pct = Math.round((correct / examQuestions.length) * 100);
  const grade = pct >= 75 ? '✅ PASSED' : '❌ FAILED';
  const scoreHtml = `
    <div class="exam-score-card" id="examScoreCard">
      <div class="score-grade">${grade}</div>
      <div class="score-num">${correct} / ${examQuestions.length}</div>
      <div class="score-pct">${pct}%</div>
      <p class="score-note">Passing mark: 75% (Philippine MARINA standard)</p>
      <button class="btn-secondary" onclick="retakeExam()" style="margin-top:12px">↩ Retake Exam</button>
    </div>`;

  const form = document.getElementById('examForm');
  form.insertAdjacentHTML('afterbegin', scoreHtml);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // disable all radios
  form.querySelectorAll('input[type=radio]').forEach(r => r.disabled = true);
  // hide submit button
  const submitRow = form.querySelector('.exam-submit-row');
  if (submitRow) submitRow.style.display = 'none';
}

function retakeExam() {
  examAnswers   = {};
  examSubmitted = false;
  examQuestions = dailyShuffle(examQuestions);
  renderExam();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
