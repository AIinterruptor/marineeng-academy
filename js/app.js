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
const VIEWS = ['homeView', 'allTopicsView', 'topicDetailView', 'aboutView', 'searchView', 'examView', 'bunkeringView'];

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

// ─── BUNKERING CALCULATIONS ──────────────────────────────────────────

// ASTM D1250 Table 54B — Volume Correction Factors (VCF) for petroleum products
// Thermal expansion coefficients (alpha) by density class at 15°C
// Reference: IP/ASTM Table 54B (petroleum measurement tables)
const ASTM_ALPHA_TABLE = [
  // [density_min, density_max, alpha_per_degC]
  [610.6,  659.5, 0.001340],
  [659.5,  700.8, 0.001225],
  [700.8,  740.3, 0.001120],
  [740.3,  779.3, 0.001026],
  [779.3,  817.0, 0.000940],
  [817.0,  853.0, 0.000862],
  [853.0,  887.0, 0.000793],
  [887.0,  920.0, 0.000730],
  [920.0,  950.0, 0.000673],  // VLSFO upper / HFO lower
  [950.0,  975.0, 0.000622],
  [975.0,  1000.0, 0.000576], // Heavy HFO
  [1000.0, 1075.0, 0.000533],
];

// ASTM D1250 Table 5A — Density correction for observed temperature
// Returns VCF = density_at_15 / density_at_T (used to convert volume at T to volume at 15)
function getAstmAlpha(density15) {
  for (const [dmin, dmax, alpha] of ASTM_ALPHA_TABLE) {
    if (density15 >= dmin && density15 < dmax) return alpha;
  }
  // fallback for very heavy products
  if (density15 >= 1000) return 0.000533;
  if (density15 < 610.6) return 0.001560;
  return 0.000650; // default HFO
}

function astmVCF(density15, tempC) {
  const alpha = getAstmAlpha(density15);
  const deltaT = tempC - 15;
  // ASTM linearised formula: VCF = 1 / (1 + alpha * deltaT)  [more accurate than simple subtraction]
  return 1 / (1 + alpha * deltaT);
}

// Build the ASTM alpha lookup table HTML
function buildAlphaTableHTML() {
  return ASTM_ALPHA_TABLE.map(([dmin, dmax, alpha]) => {
    let label = '';
    if (dmax <= 700) label = 'Naphtha/LPG';
    else if (dmax <= 800) label = 'Gasoline/Jet';
    else if (dmax <= 870) label = 'Diesel/MDO';
    else if (dmax <= 920) label = 'MGO/Light HFO';
    else if (dmax <= 970) label = 'HFO / VLSFO';
    else label = 'Heavy HFO';
    return `<tr><td>${dmin.toFixed(1)}</td><td>${dmax.toFixed(1)}</td><td>${alpha.toFixed(6)}</td><td>${label}</td></tr>`;
  }).join('');
}

function showBunkering() {
  hideAll();
  show('bunkeringView');
  document.getElementById('bunkeringContent').innerHTML = buildBunkeringPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildBunkeringPage() {
  return `
<div class="bunk-page">
  <div class="bunk-hero">
    <h1>&#x26FD; Bunkering Calculations</h1>
    <p class="bunk-subtitle">Interactive calculators for fuel oil operations — weight/volume conversion, trim correction, ROB, daily consumption, and range. VCF computed using ASTM D1250 Table 54B density-class alpha values.</p>
    <div class="bunk-badges">
      <span class="exam-badge">3AE / 2AE Level</span>
      <span class="exam-badge">ASTM D1250 Table 54B</span>
      <span class="exam-badge">MARPOL Annex VI</span>
    </div>
  </div>

  <div class="bunk-grid">

    <!-- CALC 1: Weight from Volume -->
    <div class="bunk-card" id="bc-weight">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x2696;&#xFE0F;</span>
        <div>
          <h2>Weight from Volume</h2>
          <p class="bunk-formula">W = V &times; &rho;<sub>obs</sub> &times; VCF</p>
        </div>
      </div>
      <p class="bunk-desc">Converts observed tank volume to mass in metric tonnes. VCF is computed from ASTM D1250 Table 54B using the density class of the fuel.</p>
      <div class="bunk-inputs">
        <label>Observed Volume (m&sup3;)<input type="number" id="wv-vol" placeholder="e.g. 500" step="0.1"></label>
        <label>Density at 15&deg;C (kg/m&sup3;)<input type="number" id="wv-den" placeholder="e.g. 991.0" step="0.1"></label>
        <label>Observed Temperature (&deg;C)<input type="number" id="wv-temp" placeholder="e.g. 50" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcWeight()">Calculate &rarr;</button>
      <div class="bunk-result" id="wv-result"></div>
      <div class="bunk-note">VCF = 1 / (1 + &alpha; &times; (T &minus; 15)) per ASTM D1250 Table 54B</div>
    </div>

    <!-- CALC 2: ROB from Sounding -->
    <div class="bunk-card" id="bc-rob">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F4CA;</span>
        <div>
          <h2>ROB &mdash; Remaining on Board</h2>
          <p class="bunk-formula">ROB (MT) = V<sub>tank</sub> &times; &rho;<sub>15</sub> &times; VCF</p>
        </div>
      </div>
      <p class="bunk-desc">Calculate Remaining On Board in metric tonnes from sounding/ullage and fuel density. Used before and after bunkering to determine quantity received.</p>
      <div class="bunk-inputs">
        <label>Tank Volume from sounding table (m&sup3;)<input type="number" id="rob-vol" placeholder="e.g. 320.5" step="0.1"></label>
        <label>Density at 15&deg;C (kg/m&sup3;)<input type="number" id="rob-den" placeholder="e.g. 988.0" step="0.1"></label>
        <label>Fuel Temperature (&deg;C)<input type="number" id="rob-temp" placeholder="e.g. 45" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcROB()">Calculate &rarr;</button>
      <div class="bunk-result" id="rob-result"></div>
    </div>

    <!-- CALC 3: Bunker Received -->
    <div class="bunk-card" id="bc-received">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F6A2;</span>
        <div>
          <h2>Bunker Received</h2>
          <p class="bunk-formula">Received = ROB<sub>after</sub> &minus; ROB<sub>before</sub></p>
        </div>
      </div>
      <p class="bunk-desc">Calculates quantity of fuel received during bunkering. Compares ship figure against Bunker Delivery Note (BDN). Discrepancy &gt; 0.5% triggers a MARPOL protest letter.</p>
      <div class="bunk-inputs">
        <label>ROB Before bunkering (MT)<input type="number" id="br-before" placeholder="e.g. 150.0" step="0.1"></label>
        <label>ROB After bunkering (MT)<input type="number" id="br-after" placeholder="e.g. 780.5" step="0.1"></label>
        <label>BDN Quantity (MT) &mdash; optional<input type="number" id="br-bdn" placeholder="e.g. 625.0" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcReceived()">Calculate &rarr;</button>
      <div class="bunk-result" id="br-result"></div>
      <div class="bunk-note">MARPOL requires BDN retention for 3 years. Discrepancy &gt; 0.5% &rarr; lodge protest letter before signing BDN.</div>
    </div>

    <!-- CALC 4: Daily Consumption -->
    <div class="bunk-card" id="bc-consumption">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F4C5;</span>
        <div>
          <h2>Daily Consumption (BOR)</h2>
          <p class="bunk-formula">BOR = &Delta;Bunker &divide; &Delta;days</p>
        </div>
      </div>
      <p class="bunk-desc">Average daily fuel consumption between two noon positions. Used for voyage planning, port arrival estimates, and performance monitoring reports.</p>
      <div class="bunk-inputs">
        <label>Bunker at Start (MT)<input type="number" id="dc-start" placeholder="e.g. 850.0" step="0.1"></label>
        <label>Bunker at End (MT)<input type="number" id="dc-end" placeholder="e.g. 610.0" step="0.1"></label>
        <label>Days Elapsed<input type="number" id="dc-days" placeholder="e.g. 5" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcConsumption()">Calculate &rarr;</button>
      <div class="bunk-result" id="dc-result"></div>
    </div>

    <!-- CALC 5: Range / Endurance -->
    <div class="bunk-card" id="bc-range">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F9ED;</span>
        <div>
          <h2>Range / Endurance</h2>
          <p class="bunk-formula">Days = ROB<sub>usable</sub> &divide; BOR</p>
        </div>
      </div>
      <p class="bunk-desc">Remaining steaming days at current consumption rate. Usable ROB = Total ROB minus dead stock (fuel below suction pipe). Critical for voyage planning and contingency.</p>
      <div class="bunk-inputs">
        <label>Total ROB (MT)<input type="number" id="rng-rob" placeholder="e.g. 420.0" step="0.1"></label>
        <label>Dead Stock / Safety Reserve (MT)<input type="number" id="rng-dead" placeholder="e.g. 30.0" step="0.1"></label>
        <label>Daily Consumption BOR (MT/day)<input type="number" id="rng-bor" placeholder="e.g. 55.0" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcRange()">Calculate &rarr;</button>
      <div class="bunk-result" id="rng-result"></div>
    </div>

    <!-- CALC 6: Trim Correction -->
    <div class="bunk-card" id="bc-trim">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x2693;</span>
        <div>
          <h2>Trim Correction</h2>
          <p class="bunk-formula">V<sub>corrected</sub> = V<sub>obs</sub> + &Delta;V<sub>trim</sub></p>
        </div>
      </div>
      <p class="bunk-desc">Corrects tank volume for ship trim and list using the wedge formula. When the ship is not on even keel, the sounding does not represent the true fuel level.</p>
      <div class="bunk-inputs">
        <label>Observed Volume from table (m&sup3;)<input type="number" id="tc-vol" placeholder="e.g. 300.0" step="0.1"></label>
        <label>Ship Trim (m) &mdash; positive = trim by stern<input type="number" id="tc-trim" placeholder="e.g. 1.5" step="0.01"></label>
        <label>Tank Length (m)<input type="number" id="tc-tlen" placeholder="e.g. 20.0" step="0.1"></label>
        <label>Tank Breadth (m)<input type="number" id="tc-tbrd" placeholder="e.g. 15.0" step="0.1"></label>
        <label>Ship Length between sounding points (m)<input type="number" id="tc-slen" placeholder="e.g. 180.0" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcTrim()">Calculate &rarr;</button>
      <div class="bunk-result" id="tc-result"></div>
      <div class="bunk-note">&Delta;V = (L<sub>tank</sub> &times; B<sub>tank</sub> &times; trim) &divide; (2 &times; L<sub>ship</sub>)</div>
    </div>

    <!-- CALC 7: Density Conversion -->
    <div class="bunk-card" id="bc-density">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F52C;</span>
        <div>
          <h2>Density Conversion</h2>
          <p class="bunk-formula">&deg;API = (141.5 &divide; SG<sub>15</sub>) &minus; 131.5</p>
        </div>
      </div>
      <p class="bunk-desc">Converts between density units used in bunker surveys: kg/m&sup3; at 15&deg;C, specific gravity (SG), and API gravity.</p>
      <div class="bunk-inputs">
        <label>Input Type
          <select id="dc2-type" onchange="updateDensityInputLabel()">
            <option value="kgm3">Density at 15&deg;C (kg/m&sup3;)</option>
            <option value="sg">Specific Gravity (SG at 15/4&deg;C)</option>
            <option value="api">API Gravity (&deg;API)</option>
          </select>
        </label>
        <label id="dc2-input-label">Density at 15&deg;C (kg/m&sup3;)<input type="number" id="dc2-val" placeholder="e.g. 991.0" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcDensity()">Convert &rarr;</button>
      <div class="bunk-result" id="dc2-result"></div>
    </div>

    <!-- CALC 8: WCF & Final Quantity -->
    <div class="bunk-card" id="bc-wcf">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F9EE;</span>
        <div>
          <h2>Full Quantity Chain (VCF + WCF)</h2>
          <p class="bunk-formula">MT = V &times; VCF &times; D<sub>15</sub> &times; WCF</p>
        </div>
      </div>
      <p class="bunk-desc">Full ASTM chain: observed volume &rarr; standard volume (via VCF, Table 54B) &rarr; in-vacuo weight &rarr; in-air weight (via WCF, Table 56). WCF &asymp; 0.99895 for all petroleum fuels.</p>
      <div class="bunk-inputs">
        <label>Observed Volume (m&sup3;)<input type="number" id="wf-vol" placeholder="e.g. 500" step="0.1"></label>
        <label>Density at 15&deg;C (kg/m&sup3;)<input type="number" id="wf-den" placeholder="e.g. 991.0" step="0.1"></label>
        <label>Observed Temperature (&deg;C)<input type="number" id="wf-temp" placeholder="e.g. 50" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcFullChain()">Calculate &rarr;</button>
      <div class="bunk-result" id="wf-result"></div>
      <div class="bunk-note">WCF (ASTM Table 56) corrects for air buoyancy. WCF = 1 &minus; (1.1 &divide; density). For HFO ~991 kg/m&sup3; this equals ~0.99889.</div>
    </div>

    <!-- CALC 9: Commingled Density -->
    <div class="bunk-card" id="bc-commingle">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F300;</span>
        <div>
          <h2>Commingled Density</h2>
          <p class="bunk-formula">D<sub>blend</sub> = (Q<sub>1</sub>D<sub>1</sub> + Q<sub>2</sub>D<sub>2</sub>) &divide; (Q<sub>1</sub>+Q<sub>2</sub>)</p>
        </div>
      </div>
      <p class="bunk-desc">When new bunkers are loaded on top of existing ROB (commingling), a blended density must be calculated for all subsequent calculations and the BDN.</p>
      <div class="bunk-inputs">
        <label>Existing ROB Quantity (MT)<input type="number" id="cm-q1" placeholder="e.g. 150.0" step="0.1"></label>
        <label>Existing ROB Density at 15&deg;C (kg/m&sup3;)<input type="number" id="cm-d1" placeholder="e.g. 985.0" step="0.1"></label>
        <label>New Bunkers Received (MT)<input type="number" id="cm-q2" placeholder="e.g. 500.0" step="0.1"></label>
        <label>New Bunkers Density at 15&deg;C (kg/m&sup3;)<input type="number" id="cm-d2" placeholder="e.g. 992.0" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcCommingle()">Calculate &rarr;</button>
      <div class="bunk-result" id="cm-result"></div>
    </div>

    <!-- CALC 10: SFOC -->
    <div class="bunk-card" id="bc-sfoc">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F4A8;</span>
        <div>
          <h2>SFOC &mdash; Specific Fuel Oil Consumption</h2>
          <p class="bunk-formula">SFOC = (FC &times; 10<sup>6</sup>) &divide; (P &times; t)</p>
        </div>
      </div>
      <p class="bunk-desc">Specific Fuel Oil Consumption (g/kWh) measures main engine efficiency. Lower SFOC = more fuel-efficient engine. Frequently paired with bunkering questions in 3AE/2AE licensing exams.</p>
      <div class="bunk-inputs">
        <label>Fuel Consumed (MT)<input type="number" id="sf-fc" placeholder="e.g. 25.5" step="0.1"></label>
        <label>Engine Power Output (kW)<input type="number" id="sf-pw" placeholder="e.g. 12000" step="1"></label>
        <label>Time Period (hours)<input type="number" id="sf-hr" placeholder="e.g. 24" step="0.1"></label>
      </div>
      <button class="bunk-calc-btn" onclick="calcSFOC()">Calculate &rarr;</button>
      <div class="bunk-result" id="sf-result"></div>
      <div class="bunk-note">Typical 2-stroke slow-speed ME: SFOC 160&ndash;180 g/kWh. At MCR, modern WinGD/MAN engines achieve ~155 g/kWh.</div>
    </div>

    <!-- ASTM TABLE -->
    <div class="bunk-card bunk-wide" id="bc-astm">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F4D0;</span>
        <div>
          <h2>ASTM D1250 Table 54B &mdash; Alpha (&alpha;) by Density Class</h2>
        </div>
      </div>
      <p class="bunk-desc">Thermal expansion coefficient (&alpha;) used in VCF calculation. Higher density fuels expand less per &deg;C. These values are used in the calculators above automatically.</p>
      <div style="overflow-x:auto">
        <table class="bunk-table bunk-table-full">
          <thead><tr><th>Density Min (kg/m&sup3;)</th><th>Density Max (kg/m&sup3;)</th><th>&alpha; (per &deg;C)</th><th>Typical Product</th></tr></thead>
          <tbody>${buildAlphaTableHTML()}</tbody>
        </table>
      </div>
    </div>

    <!-- REFERENCE TABLE -->
    <div class="bunk-card bunk-wide" id="bc-ref">
      <div class="bunk-card-header">
        <span class="bunk-icon">&#x1F4CB;</span>
        <div>
          <h2>Quick Reference &mdash; Key Terms &amp; Formulas</h2>
        </div>
      </div>
      <div class="bunk-ref-grid">
        <div class="bunk-ref-section">
          <h3>Abbreviations</h3>
          <table class="bunk-table">
            <tr><td>ROB</td><td>Remaining On Board</td></tr>
            <tr><td>BDN</td><td>Bunker Delivery Note</td></tr>
            <tr><td>BOR</td><td>Bunker On-board Report / Burn-Off Rate</td></tr>
            <tr><td>VCF</td><td>Volume Correction Factor</td></tr>
            <tr><td>VEF</td><td>Vessel Experience Factor (ship fig &divide; shore meter)</td></tr>
            <tr><td>HFO</td><td>Heavy Fuel Oil (density 900&ndash;1010 kg/m&sup3;)</td></tr>
            <tr><td>VLSFO</td><td>Very Low Sulphur Fuel Oil (S &le; 0.50%)</td></tr>
            <tr><td>MGO</td><td>Marine Gas Oil (distillate, ~840&ndash;875 kg/m&sup3;)</td></tr>
            <tr><td>ASTM</td><td>American Society for Testing and Materials</td></tr>
          </table>
        </div>
        <div class="bunk-ref-section">
          <h3>Core Formulas</h3>
          <table class="bunk-table">
            <tr><td>Weight (MT)</td><td>= V (m&sup3;) &times; &rho;<sub>15</sub> (t/m&sup3;) &times; VCF</td></tr>
            <tr><td>VCF (ASTM 54B)</td><td>= 1 / (1 + &alpha; &times; (T &minus; 15))</td></tr>
            <tr><td>BOR (MT/day)</td><td>= (ROB<sub>start</sub> &minus; ROB<sub>end</sub>) &divide; days</td></tr>
            <tr><td>Endurance (days)</td><td>= (ROB &minus; Dead Stock) &divide; BOR</td></tr>
            <tr><td>Trim &Delta;V (m&sup3;)</td><td>= L &times; B &times; trim &divide; (2 &times; L<sub>ship</sub>)</td></tr>
            <tr><td>API &rarr; SG</td><td>= 141.5 &divide; (API + 131.5)</td></tr>
            <tr><td>SG &rarr; kg/m&sup3;</td><td>= SG &times; 1000</td></tr>
          </table>
        </div>
        <div class="bunk-ref-section">
          <h3>Exam Tips</h3>
          <table class="bunk-table">
            <tr><td>Reference temp</td><td>15&deg;C (ASTM D1250 standard)</td></tr>
            <tr><td>BDN protest</td><td>Discrepancy &gt; 0.5% &rarr; protest letter</td></tr>
            <tr><td>Dead stock</td><td>Fuel below suction &mdash; unusable</td></tr>
            <tr><td>MARPOL BDN</td><td>Keep on board minimum 3 years</td></tr>
            <tr><td>Density check</td><td>Ship lab vs BDN &mdash; if &gt;15 kg/m&sup3; diff &rarr; protest</td></tr>
            <tr><td>Sulphur limit</td><td>0.50% global (2020) / 0.10% ECA</td></tr>
          </table>
        </div>
      </div>
    </div>

  </div>
</div>`;
}

// ─── BUNKERING CALC FUNCTIONS ────────────────────────────────────────

function bunkShowResult(id, html) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = html; el.style.display = ''; }
}

function calcWeight() {
  const vol  = parseFloat(document.getElementById('wv-vol').value);
  const den  = parseFloat(document.getElementById('wv-den').value);
  const temp = parseFloat(document.getElementById('wv-temp').value);
  if ([vol, den, temp].some(isNaN)) return bunkShowResult('wv-result', '<span class="bunk-err">Please fill all fields.</span>');
  const vcf    = astmVCF(den, temp);
  const alpha  = getAstmAlpha(den);
  const weight = vol * (den / 1000) * vcf;
  bunkShowResult('wv-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${weight.toFixed(2)} MT</span>
    <span class="bunk-ans-detail">VCF = ${vcf.toFixed(5)} &nbsp;|&nbsp; &alpha; = ${alpha.toFixed(6)} &nbsp;|&nbsp; &rho; at ${temp}&deg;C &asymp; ${(den * vcf).toFixed(1)} kg/m&sup3;</span>
  </div>`);
}

function calcROB() {
  const vol  = parseFloat(document.getElementById('rob-vol').value);
  const den  = parseFloat(document.getElementById('rob-den').value);
  const temp = parseFloat(document.getElementById('rob-temp').value);
  if ([vol, den, temp].some(isNaN)) return bunkShowResult('rob-result', '<span class="bunk-err">Please fill all fields.</span>');
  const vcf   = astmVCF(den, temp);
  const alpha = getAstmAlpha(den);
  const rob   = vol * (den / 1000) * vcf;
  bunkShowResult('rob-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${rob.toFixed(2)} MT</span>
    <span class="bunk-ans-detail">VCF = ${vcf.toFixed(5)} &nbsp;|&nbsp; &alpha; = ${alpha.toFixed(6)}</span>
  </div>`);
}

function calcReceived() {
  const before = parseFloat(document.getElementById('br-before').value);
  const after  = parseFloat(document.getElementById('br-after').value);
  const bdn    = parseFloat(document.getElementById('br-bdn').value);
  if ([before, after].some(isNaN)) return bunkShowResult('br-result', '<span class="bunk-err">Please fill Before and After ROB.</span>');
  const received = after - before;
  let html = `<div class="bunk-ans"><span class="bunk-ans-val">${received.toFixed(2)} MT received</span>`;
  if (!isNaN(bdn)) {
    const diff    = received - bdn;
    const pct     = Math.abs(diff / bdn * 100);
    const protest = pct > 0.5;
    html += `<span class="bunk-ans-detail">BDN: ${bdn.toFixed(2)} MT &nbsp;|&nbsp; Diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} MT (${pct.toFixed(2)}%)</span>`;
    if (protest) html += `<span class="bunk-warn">&#x26A0;&#xFE0F; Discrepancy &gt; 0.5% &mdash; lodge MARPOL protest letter</span>`;
    else         html += `<span class="bunk-ok">&#x2713; Within 0.5% tolerance</span>`;
  }
  html += '</div>';
  bunkShowResult('br-result', html);
}

function calcConsumption() {
  const start = parseFloat(document.getElementById('dc-start').value);
  const end   = parseFloat(document.getElementById('dc-end').value);
  const days  = parseFloat(document.getElementById('dc-days').value);
  if ([start, end, days].some(isNaN) || days <= 0) return bunkShowResult('dc-result', '<span class="bunk-err">Please fill all fields.</span>');
  const consumed = start - end;
  const bor      = consumed / days;
  bunkShowResult('dc-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${bor.toFixed(2)} MT/day</span>
    <span class="bunk-ans-detail">Total consumed: ${consumed.toFixed(2)} MT over ${days} days</span>
  </div>`);
}

function calcRange() {
  const rob  = parseFloat(document.getElementById('rng-rob').value);
  const dead = parseFloat(document.getElementById('rng-dead').value) || 0;
  const bor  = parseFloat(document.getElementById('rng-bor').value);
  if ([rob, bor].some(isNaN) || bor <= 0) return bunkShowResult('rng-result', '<span class="bunk-err">Please fill ROB and BOR.</span>');
  const usable = rob - dead;
  const days   = usable / bor;
  bunkShowResult('rng-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${days.toFixed(1)} days endurance</span>
    <span class="bunk-ans-detail">Usable ROB: ${usable.toFixed(2)} MT &nbsp;|&nbsp; At ${bor.toFixed(1)} MT/day</span>
  </div>`);
}

function calcTrim() {
  const vol  = parseFloat(document.getElementById('tc-vol').value);
  const trim = parseFloat(document.getElementById('tc-trim').value);
  const tlen = parseFloat(document.getElementById('tc-tlen').value);
  const tbrd = parseFloat(document.getElementById('tc-tbrd').value);
  const slen = parseFloat(document.getElementById('tc-slen').value);
  if ([vol, trim, tlen, tbrd, slen].some(isNaN) || slen === 0) return bunkShowResult('tc-result', '<span class="bunk-err">Please fill all fields.</span>');
  const deltaV    = (tlen * tbrd * trim) / (2 * slen);
  const corrected = vol + deltaV;
  bunkShowResult('tc-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">Corrected: ${corrected.toFixed(3)} m&#xB3;</span>
    <span class="bunk-ans-detail">Trim correction &Delta;V: ${deltaV >= 0 ? '+' : ''}${deltaV.toFixed(3)} m&#xB3;</span>
  </div>`);
}

function updateDensityInputLabel() {
  const type  = document.getElementById('dc2-type').value;
  const label = document.getElementById('dc2-input-label');
  const input = document.getElementById('dc2-val');
  const map   = { kgm3: ['Density at 15°C (kg/m³)', '991.0'], sg: ['Specific Gravity', '0.9910'], api: ['API Gravity (°API)', '11.5'] };
  label.firstChild.textContent = map[type][0];
  input.placeholder = 'e.g. ' + map[type][1];
}

function calcDensity() {
  const type = document.getElementById('dc2-type').value;
  const val  = parseFloat(document.getElementById('dc2-val').value);
  if (isNaN(val)) return bunkShowResult('dc2-result', '<span class="bunk-err">Please enter a value.</span>');
  let kgm3, sg, api;
  if      (type === 'kgm3') { kgm3 = val; sg = val / 1000; api = (141.5 / sg) - 131.5; }
  else if (type === 'sg')   { sg = val; kgm3 = val * 1000; api = (141.5 / sg) - 131.5; }
  else                      { api = val; sg = 141.5 / (api + 131.5); kgm3 = sg * 1000; }
  const alpha = getAstmAlpha(kgm3);
  bunkShowResult('dc2-result', `<div class="bunk-ans">
    <span class="bunk-ans-detail">kg/m&#xB3; at 15&#xB0;C: <strong>${kgm3.toFixed(1)}</strong></span>
    <span class="bunk-ans-detail">SG (15/4&#xB0;C): <strong>${sg.toFixed(4)}</strong></span>
    <span class="bunk-ans-detail">API Gravity: <strong>${api.toFixed(2)} &#xB0;API</strong></span>
    <span class="bunk-ans-detail">ASTM &alpha;: <strong>${alpha.toFixed(6)} /&#xB0;C</strong></span>
  </div>`);
}

function calcFullChain() {
  const vol  = parseFloat(document.getElementById('wf-vol').value);
  const den  = parseFloat(document.getElementById('wf-den').value);
  const temp = parseFloat(document.getElementById('wf-temp').value);
  if ([vol, den, temp].some(isNaN)) return bunkShowResult('wf-result', '<span class="bunk-err">Please fill all fields.</span>');
  const vcf    = astmVCF(den, temp);
  const alpha  = getAstmAlpha(den);
  const wcf    = 1 - (1.1 / den);   // ASTM Table 56 approximation
  const stdVol = vol * vcf;
  const mtVacuo = stdVol * (den / 1000);
  const mtAir   = mtVacuo * wcf;
  bunkShowResult('wf-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${mtAir.toFixed(3)} MT (in air)</span>
    <span class="bunk-ans-detail">Standard Vol @ 15&#xB0;C: ${stdVol.toFixed(3)} m&#xB3; &nbsp;|&nbsp; VCF = ${vcf.toFixed(5)}</span>
    <span class="bunk-ans-detail">In-vacuo: ${mtVacuo.toFixed(3)} MT &nbsp;|&nbsp; WCF = ${wcf.toFixed(5)} &nbsp;|&nbsp; &alpha; = ${alpha.toFixed(6)}</span>
  </div>`);
}

function calcCommingle() {
  const q1 = parseFloat(document.getElementById('cm-q1').value);
  const d1 = parseFloat(document.getElementById('cm-d1').value);
  const q2 = parseFloat(document.getElementById('cm-q2').value);
  const d2 = parseFloat(document.getElementById('cm-d2').value);
  if ([q1, d1, q2, d2].some(isNaN)) return bunkShowResult('cm-result', '<span class="bunk-err">Please fill all fields.</span>');
  const totalMT = q1 + q2;
  const blendD  = (q1 * d1 + q2 * d2) / totalMT;
  bunkShowResult('cm-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">Blended Density: ${blendD.toFixed(1)} kg/m&#xB3;</span>
    <span class="bunk-ans-detail">Total Quantity: ${totalMT.toFixed(1)} MT &nbsp;|&nbsp; Use this density for all subsequent VCF/WCF calculations</span>
  </div>`);
}

function calcSFOC() {
  const fc = parseFloat(document.getElementById('sf-fc').value);
  const pw = parseFloat(document.getElementById('sf-pw').value);
  const hr = parseFloat(document.getElementById('sf-hr').value);
  if ([fc, pw, hr].some(isNaN) || pw <= 0 || hr <= 0) return bunkShowResult('sf-result', '<span class="bunk-err">Please fill all fields.</span>');
  const sfoc = (fc * 1e6) / (pw * hr);
  let grade = '';
  if (sfoc < 160) grade = '&#x2705; Excellent (below 160 g/kWh)';
  else if (sfoc < 175) grade = '&#x1F7E2; Good (160&ndash;175 g/kWh)';
  else if (sfoc < 195) grade = '&#x1F7E1; Average (175&ndash;195 g/kWh)';
  else grade = '&#x1F534; Above average &mdash; check engine condition';
  bunkShowResult('sf-result', `<div class="bunk-ans">
    <span class="bunk-ans-val">${sfoc.toFixed(1)} g/kWh</span>
    <span class="bunk-ans-detail">${grade}</span>
    <span class="bunk-ans-detail">FC: ${fc.toFixed(1)} MT &nbsp;|&nbsp; Power: ${pw.toFixed(0)} kW &nbsp;|&nbsp; Time: ${hr.toFixed(1)} h</span>
  </div>`);
}
