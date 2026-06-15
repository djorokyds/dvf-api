module.exports = async function handler(req, res) {
  const { categories, depenses_total } = req.query;

  if (!categories || !depenses_total) {
    return res.status(400).json({ error: "Paramètres manquants (categories, depenses_total)" });
  }

  const total = parseFloat(depenses_total.replace(/\s/g, '').replace(',', '.'));

  // Parse categories : "offrande+2000/resto+2500/..."
  const items = categories.split('/').map(item => {
    const parts = item.trim().split('+');
    const label = parts[0].trim();
    const montant = parseFloat(parts[1]);
    const ratio = Math.round((montant / total) * 100);
    return { label, montant, ratio };
  }).filter(i => i.label && !isNaN(i.montant));

  // Couleurs sobres dark
  const colors = [
    { bg: '#2D4A6B', glow: '#4A7FAA', text: '#7EB8E8' },
    { bg: '#2D5A3D', glow: '#4A9A60', text: '#7ED4A0' },
    { bg: '#5A2D4A', glow: '#9A4A7A', text: '#D47EB8' },
    { bg: '#5A4A2D', glow: '#9A7A4A', text: '#D4B87E' },
    { bg: '#2D3D5A', glow: '#4A6A9A', text: '#7EA8D4' },
    { bg: '#5A2D2D', glow: '#9A4A4A', text: '#D47E7E' },
    { bg: '#3D5A2D', glow: '#6A9A4A', text: '#A8D47E' },
    { bg: '#4A2D5A', glow: '#7A4A9A', text: '#B87ED4' },
  ];

  // Taille bulle : min 60px, max 130px selon ratio
  const minR = 40, maxR = 90;
  const maxRatio = Math.max(...items.map(i => i.ratio));

  const itemsWithSize = items.map((item, idx) => ({
    ...item,
    r: Math.round(minR + (item.ratio / maxRatio) * (maxR - minR)),
    color: colors[idx % colors.length],
  }));

  // Pack circles — algorithme simple de placement
  function packCircles(circles, W, H) {
    const placed = [];
    const cx = W / 2, cy = H / 2;

    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      let bestX = cx, bestY = cy;
      let placed_flag = false;

      if (placed.length === 0) {
        bestX = cx; bestY = cy;
        placed_flag = true;
      } else {
        // Essayer autour des cercles déjà placés
        for (let attempts = 0; attempts < 300; attempts++) {
          const angle = Math.random() * Math.PI * 2;
          const ref = placed[Math.floor(Math.random() * placed.length)];
          const dist = ref.r + c.r + 8 + Math.random() * 20;
          const tx = ref.x + Math.cos(angle) * dist;
          const ty = ref.y + Math.sin(angle) * dist;

          // Vérifier pas de collision
          let collision = false;
          for (const p of placed) {
            const d = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
            if (d < p.r + c.r + 6) { collision = true; break; }
          }

          // Dans les limites
          if (!collision && tx - c.r > 4 && tx + c.r < W - 4 && ty - c.r > 4 && ty + c.r < H - 4) {
            bestX = tx; bestY = ty;
            placed_flag = true;
            break;
          }
        }

        if (!placed_flag) {
          // Fallback — forcer une position
          const angle = (i / circles.length) * Math.PI * 2;
          bestX = Math.max(c.r + 4, Math.min(W - c.r - 4, cx + Math.cos(angle) * (maxR + 20)));
          bestY = Math.max(c.r + 4, Math.min(H - c.r - 4, cy + Math.sin(angle) * (maxR + 20)));
        }
      }

      placed.push({ ...c, x: bestX, y: bestY });
    }

    return placed;
  }

  const W = 360, H = 420;
  // Trier par taille décroissante pour meilleur packing
  const sorted = [...itemsWithSize].sort((a, b) => b.r - a.r);
  const packed = packCircles(sorted, W, H);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synthèse - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #111118;
      color: #eaeaea;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0 12px;
    }

    .total-label {
      font-size: 11px;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .total-value {
      font-size: 22px;
      font-weight: 700;
      color: #eaeaea;
      margin-bottom: 10px;
    }

    svg { overflow: visible; cursor: pointer; }

    /* Tooltip */
    .tooltip {
      position: fixed;
      background: #1e1e2e;
      border: 1px solid #333355;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      min-width: 130px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .tooltip.visible { opacity: 1; }
    .tt-label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .tt-amount { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .tt-ratio { font-size: 11px; color: #666; }
  </style>
</head>
<body>

  <div class="total-label">Total dépenses</div>
  <div class="total-value">${total.toLocaleString('fr-FR')} €</div>

  <svg id="svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      ${packed.map((c, i) => `
        <radialGradient id="grad${i}" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${c.color.glow}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${c.color.bg}" stop-opacity="1"/>
        </radialGradient>
        <radialGradient id="glow${i}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c.color.glow}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${c.color.glow}" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur${i}">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      `).join('')}
    </defs>

    ${packed.map((c, i) => `
      <g class="bubble" data-label="${c.label}" data-montant="${c.montant}" data-ratio="${c.ratio}" data-color="${c.color.text}" style="cursor:pointer">
        <!-- Lueur externe -->
        <circle cx="${c.x}" cy="${c.y}" r="${c.r + 12}" fill="url(#glow${i})" filter="url(#blur${i})"/>
        <!-- Corps bulle -->
        <circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="url(#grad${i})"/>
        <!-- Reflet haut -->
        <ellipse cx="${c.x - c.r * 0.2}" cy="${c.y - c.r * 0.35}" rx="${c.r * 0.35}" ry="${c.r * 0.18}" fill="white" opacity="0.08"/>
        <!-- Label -->
        <text
          x="${c.x}" y="${c.y - (c.r > 55 ? 8 : 4)}"
          text-anchor="middle"
          font-size="${c.r > 70 ? 13 : c.r > 50 ? 11 : 9}"
          font-weight="600"
          fill="${c.color.text}"
          font-family="-apple-system, sans-serif"
        >${c.label.length > 10 ? c.label.substring(0, 9) + '…' : c.label}</text>
        ${c.r > 45 ? `
        <text
          x="${c.x}" y="${c.y + (c.r > 55 ? 10 : 8)}"
          text-anchor="middle"
          font-size="${c.r > 70 ? 12 : 10}"
          font-weight="700"
          fill="white"
          opacity="0.7"
          font-family="-apple-system, sans-serif"
        >${c.ratio}%</text>
        ` : ''}
      </g>
    `).join('')}
  </svg>

  <div class="tooltip" id="tooltip">
    <div class="tt-label" id="tt-label"></div>
    <div class="tt-amount" id="tt-amount"></div>
    <div class="tt-ratio" id="tt-ratio"></div>
  </div>

  <script>
    const tooltip = document.getElementById('tooltip');
    const ttLabel = document.getElementById('tt-label');
    const ttAmount = document.getElementById('tt-amount');
    const ttRatio = document.getElementById('tt-ratio');

    document.querySelectorAll('.bubble').forEach(bubble => {
      bubble.addEventListener('click', (e) => {
        const label = bubble.dataset.label;
        const montant = parseFloat(bubble.dataset.montant);
        const ratio = bubble.dataset.ratio;
        const color = bubble.dataset.color;

        ttLabel.textContent = label;
        ttAmount.textContent = montant.toLocaleString('fr-FR') + ' €';
        ttAmount.style.color = color;
        ttRatio.textContent = ratio + '% des dépenses totales';

        // Position tooltip
        const rect = e.target.closest('svg').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        tooltip.style.left = Math.min(x + 12, window.innerWidth - 160) + 'px';
        tooltip.style.top = Math.max(y - 70, 8) + 'px';
        tooltip.classList.add('visible');

        // Fermer après 3s
        clearTimeout(window._ttTimer);
        window._ttTimer = setTimeout(() => tooltip.classList.remove('visible'), 3000);
      });
    });

    // Fermer en cliquant ailleurs
    document.addEventListener('click', e => {
      if (!e.target.closest('.bubble')) {
        tooltip.classList.remove('visible');
      }
    });
  </script>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
