// ─── Shared Game Page Script ──────────────────────────────────
// Loads info.json and populates ALL dynamic elements on every
// game page (about, privacy, terms). Also handles tab state
// and fetching .txt content for privacy / terms pages.
// ─────────────────────────────────────────────────────────────

(async function () {
  const parts   = location.pathname.split('/').filter(Boolean);
  const page    = (parts[parts.length - 1] || '').replace('.html', '');
  const gameDir = location.pathname.replace(/\/[^/]*$/, ''); // e.g. /games/splavo

  // ── 1. Load info.json ────────────────────────────────────
  let info = {};
  try {
    const res = await fetch(gameDir + '/info.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    info = await res.json();
  } catch (e) {
    console.error('Could not load info.json:', e);
  }

  // ── 2. Populate shared header elements ───────────────────
  _fill('game-title', info.name);
  _fill('game-genre', info.genre);
  _fill('game-genre-chip', info.genre);

  // Page <title>
  const labels = { about: 'About', privacy: 'Privacy Policy', terms: 'Terms of Use' };
  document.title = (info.name || 'Game') + ' - ' + (labels[page] || page) + ' | OKUMO';

  // Icon: replace placeholder with <img>
  const iconEl = document.getElementById('game-icon');
  if (iconEl && info.icon) {
    const img   = document.createElement('img');
    img.src     = gameDir + '/' + info.icon;
    img.alt     = (info.name || 'Game') + ' icon';
    img.onerror = () => { iconEl.textContent = '🎮'; };
    iconEl.innerHTML = '';
    iconEl.appendChild(img);
  }

  // ── 3. Active tab highlight ──────────────────────────────
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === page);
  });

  // ── 4. About page: populate dynamic content ──────────────
  if (page === 'about') {
    _fill('game-description', info.description);

    const metaPlatform  = document.getElementById('meta-platform');
    const metaDeveloper = document.getElementById('meta-developer');
    if (metaPlatform && info.platform)   metaPlatform.textContent  = Array.isArray(info.platform) ? info.platform.join(', ') : info.platform;
    if (metaDeveloper && info.developer) metaDeveloper.textContent = info.developer;

    const gpLink = document.getElementById('google-play-link');
    if (gpLink) {
      if (info.google_play_url) {
        gpLink.href = info.google_play_url;
        gpLink.style.display = '';
      } else {
        gpLink.style.display = 'none';
      }
    }
  }

  // ── 5. Load .txt content (privacy / terms pages) ─────────
  const contentArea = document.getElementById('txt-content');
  if (!contentArea) return;

  const txtFile = page === 'privacy' ? 'privacy.txt' : 'terms.txt';

  try {
    const txtRes = await fetch(gameDir + '/' + txtFile);
    if (!txtRes.ok) throw new Error('HTTP ' + txtRes.status);
    const raw = await txtRes.text();
    contentArea.innerHTML = parseTxt(raw);
  } catch (err) {
    contentArea.innerHTML = '<p style="color:var(--text-muted)">Content not found. (' + err.message + ')</p>';
  }

  // ── Helpers ──────────────────────────────────────────────

  function _fill(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }

  function parseTxt(text) {
    const lines  = text.split('\n');
    let   html   = '';
    let   inList = false;

    for (const raw of lines) {
      const line = raw.trim();

      const luMatch = line.match(/^\[LAST_UPDATED:\s*(.+)\]$/i);
      if (luMatch) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p class="last-updated">Last updated: ' + esc(luMatch[1]) + '</p>';
        continue;
      }

      if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h2>' + esc(line.slice(3)) + '</h2>';
        continue;
      }

      if (line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h2 style="font-size:16px;margin-top:24px;margin-bottom:8px">' + esc(line.slice(4)) + '</h2>';
        continue;
      }

      if (line.startsWith('- ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + esc(line.slice(2)) + '</li>';
        continue;
      }

      if (!line) {
        if (inList) { html += '</ul>'; inList = false; }
        continue;
      }

      if (inList) { html += '</ul>'; inList = false; }
      html += '<p>' + esc(line) + '</p>';
    }

    if (inList) html += '</ul>';
    return html;
  }

  function esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();