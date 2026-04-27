// ─── Shared Game Page Script ──────────────────────────────────

(async function () {
  const parts   = location.pathname.split('/').filter(Boolean);
  const page    = (parts[parts.length - 1] || '').replace('.html', '');
  const gameDir = location.pathname.replace(/\/[^/]*$/, '');

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

  const labels = { about: 'About', privacy: 'Privacy Policy', terms: 'Terms of Use' };
  document.title = (info.name || 'Game') + ' - ' + (labels[page] || page) + ' | OKUMO';

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

  // ── 4. About page ────────────────────────────────────────
  if (page === 'about') {
    _fill('game-description', info.description);

    const metaPlatform  = document.getElementById('meta-platform');
    const metaDeveloper = document.getElementById('meta-developer');
    if (metaPlatform && info.platform)
      metaPlatform.textContent = Array.isArray(info.platform) ? info.platform.join(', ') : info.platform;
    if (metaDeveloper && info.developer)
      metaDeveloper.textContent = info.developer;

    const gpLink = document.getElementById('google-play-link');
    if (gpLink) {
      gpLink.style.display = info.google_play_url ? '' : 'none';
      if (info.google_play_url) gpLink.href = info.google_play_url;
    }
  }

  // ── 5. Load .txt content (privacy / terms) ───────────────
  const contentArea = document.getElementById('txt-content');
  if (!contentArea) return;

  const txtFile = page === 'privacy' ? 'privacy.txt' : 'terms.txt';
  try {
    const txtRes = await fetch(gameDir + '/' + txtFile);
    if (!txtRes.ok) throw new Error('HTTP ' + txtRes.status);
    contentArea.innerHTML = parseTxt(await txtRes.text());
  } catch (err) {
    contentArea.innerHTML = '<p style="color:var(--text-muted)">Content not found. (' + err.message + ')</p>';
  }

  // ─────────────────────────────────────────────────────────
  // TEXT PARSER
  // ─────────────────────────────────────────────────────────
  //
  // LINE-LEVEL SYNTAX:
  //   [LAST_UPDATED: Month DD, YYYY]  - date stamp
  //   ## Heading                      - section heading
  //   ### Sub-heading                 - smaller heading
  //   - item                          - bullet list item
  //   -- item                         - indented sub-item (with dot)
  //   (blank line)                    - closes any open list
  //   any other text                  - paragraph
  //
  // INLINE SYNTAX (works inside paragraphs, list items, headings):
  //   **bold text**                   - bold
  //   __underlined text__             - underline
  //   [label](https://...)            - clickable link with custom label
  //   https://example.com             - bare URL auto-linked
  //
  // ─────────────────────────────────────────────────────────

  function parseTxt(text) {
    const lines = text.split('\n');
    let html    = '';
    // track open list states
    let inList    = false;  // <ul class="txt-list">   opened by  "- "
    let inSubList = false;  // <ul class="txt-sublist"> opened by "--"

    function closeSubList() { if (inSubList) { html += '</ul>'; inSubList = false; } }
    function closeList()    { closeSubList(); if (inList) { html += '</ul>'; inList = false; } }

    for (const raw of lines) {
      const line = raw.trim();

      // [LAST_UPDATED: ...]
      const luMatch = line.match(/^\[LAST_UPDATED:\s*(.+)\]$/i);
      if (luMatch) {
        closeList();
        html += '<p class="last-updated">Last updated: ' + fmt(esc(luMatch[1])) + '</p>';
        continue;
      }

      // ## Heading
      if (line.startsWith('## ')) {
        closeList();
        html += '<h2>' + fmt(esc(line.slice(3))) + '</h2>';
        continue;
      }

      // ### Sub-heading
      if (line.startsWith('### ')) {
        closeList();
        html += '<h2 style="font-size:16px;margin-top:24px;margin-bottom:8px">' + fmt(esc(line.slice(4))) + '</h2>';
        continue;
      }

      // -- Sub-item  (must be checked BEFORE "- " to avoid false match)
      if (line.startsWith('-- ')) {
        if (!inList)    { html += '<ul class="txt-list">'; inList = true; }
        if (!inSubList) { html += '<ul class="txt-sublist">'; inSubList = true; }
        html += '<li>' + fmt(esc(line.slice(3))) + '</li>';
        continue;
      }

      // - Bullet item
      if (line.startsWith('- ')) {
        closeSubList();
        if (!inList) { html += '<ul class="txt-list">'; inList = true; }
        html += '<li>' + fmt(esc(line.slice(2))) + '</li>';
        continue;
      }

      // Blank line
      if (!line) {
        closeList();
        continue;
      }

      // Paragraph
      closeList();
      html += '<p>' + fmt(esc(line)) + '</p>';
    }

    closeList();
    return html;
  }

  // ── Inline formatter (runs AFTER esc()) ──────────────────
  // Patterns applied to already-escaped text.
  // URLs are safe because esc() only changes & < > "
  // and href values are built from the raw capture before esc() ran on them
  // (we re-escape them separately inside fmt).
  //
  // NOTE: Because esc() ran first, literal ** and __ and [ in source text
  // are preserved as-is; only our patterns transform them.
  function fmt(escaped) {
    return escaped
      // [label](url)  — linked text
      // url may contain &amp; (from esc()) — unescape back to & for the href
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, function(_, label, url) {
        const href = url.replace(/&amp;/g, '&').replace(/"/g, '%22');
        return '<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>';
      })
      // **bold**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // __underline__
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // bare URLs — match (&amp;) as part of URL, unescape for href
      // stops at whitespace, comma, semicolon, closing paren/bracket, angle bracket
      .replace(/(?<!href=")(https?:\/\/(?:[^\s,;<>()\[\]&]|&amp;)+)/g, function(_, url) {
        const href    = url.replace(/&amp;/g, '&');
        const display = href.replace(/^https?:\/\//, '');
        return '<a href="' + href + '" target="_blank" rel="noopener">' + display + '</a>';
      });
  }

  // ── HTML escape (always first, before fmt) ───────────────
  function esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _fill(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }

})();