// Main page - loads games.json and renders game cards
(async function () {
  const grid = document.getElementById('games-grid');

  // Smart icon path resolver:
  // "icon.png"              → /games/splavo/icon.png   (filename only)
  // "games/splavo/icon.png" → /games/splavo/icon.png   (relative path, add leading /)
  // "/games/splavo/icon.png"→ /games/splavo/icon.png   (already absolute, use as-is)
  // "https://..."           → https://...              (external URL, use as-is)
  function resolveIcon(icon, gameId) {
    if (!icon) return null;
    if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;
    if (icon.startsWith('/')) return icon;           // already absolute
    if (icon.includes('/')) return '/' + icon;       // relative path like "games/splavo/icon.png"
    return `/games/${gameId}/${icon}`;               // bare filename like "icon.png"
  }

  // SVG arrow for card (replaces ugly ↗)
  const arrowSVG = `<svg class="game-card-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 13L13 5M13 5H7M13 5V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  try {
    const res  = await fetch('/games.json');
    const data = await res.json();

    if (!data.games || data.games.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);padding:24px 0">No games yet. Stay tuned!</p>';
      return;
    }

    data.games.forEach((game, i) => {
      const delay   = Math.min(i + 1, 4);
      const card    = document.createElement('a');
      card.href     = `/games/${game.id}/about.html`;
      card.className = `game-card fade-up fade-up-${delay}`;

      const iconSrc  = resolveIcon(game.icon, game.id);
      const iconHtml = iconSrc
        ? `<div class="game-card-icon">
             <img src="${iconSrc}" alt="${game.name} icon"
                  onerror="this.parentElement.innerHTML='<span style=\\'font-size:40px;line-height:1\\'>🎮</span>'">
           </div>`
        : `<div class="game-card-icon"><span style="font-size:40px;line-height:1">🎮</span></div>`;

      card.innerHTML = `
        ${iconHtml}
        <div class="game-card-name">${game.name}</div>
        <div class="game-card-tagline">${game.tagline}</div>
        ${arrowSVG}
      `;

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load games:', err);
    grid.innerHTML = '<p style="color:var(--text-muted)">Could not load games list.</p>';
  }
})();