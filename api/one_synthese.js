module.exports = async function handler(req, res) {
  const { categories, depenses_total } = req.query;

  if (!categories || !depenses_total) {
    return res.status(400).json({ error: "Paramètres manquants (categories, depenses_total)" });
  }

  const total = parseFloat(depenses_total.replace(/[€\s\u00a0]/g, '').replace(',', '.'));

  const rawItems = categories.split('/').map(item => {
    const lastPipe = item.lastIndexOf('|');
    if (lastPipe === -1) return null;
    const label = item.substring(0, lastPipe).trim();
    const montantRaw = item.substring(lastPipe + 1).replace(/[€\s\u00a0]/g, '').replace(',', '.');
    const montant = parseFloat(montantRaw);
    const ratio = Math.round((montant / total) * 100);
    return { label, montant, ratio };
  }).filter(i => i && i.label && !isNaN(i.montant) && i.montant > 0);

  // Option A — regrouper les < 3% en "Autres"
  const mainItems = rawItems.filter(i => i.ratio >= 3);
  const autresItems = rawItems.filter(i => i.ratio < 3);
  const autresMontant = autresItems.reduce((s, i) => s + i.montant, 0);
  const autresRatio = Math.round((autresMontant / total) * 100);

  const items = autresMontant > 0
    ? [...mainItems, { label: 'Autres', montant: autresMontant, ratio: autresRatio }]
    : mainItems;

  if (items.length === 0) {
    return res.status(400).json({ error: "Aucune catégorie valide", raw: categories });
  }

  const n = items.length;
  const cx = 240, cy = 240;
  const innerR = 50;
  const maxR = 200;  // agrandi
  const segAngle = 360 / n;
  const gapAngle = 1.5;

  const baseColors = [
    '#1e4d8c', '#2260ad', '#2673ce', '#3a87d4',
    '#4f9bda', '#64afe0', '#3d5a9e', '#5270b8',
    '#6786d2', '#79c3e6', '#1a3a6b', '#7c9cec',
  ];

  const maxMontant = Math.max(...items.map(i => i.montant));

  const segments = items.map((item, i) => {
    const startAngle = -90 + i * segAngle;
    const endAngle = startAngle + segAngle - gapAngle;
    const outerR = innerR + ((item.montant / maxMontant) * (maxR - innerR));
    return {
      ...item,
      startAngle,
      endAngle,
      outerR,
      color: baseColors[i % baseColors.length],
      midAngle: startAngle + (segAngle - gapAngle) / 2,
    };
  });

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeSegment(cx, cy, rInner, rOuter, startAngle, endAngle) {
    const s1 = polarToXY(cx, cy, rOuter, startAngle);
    const e1 = polarToXY(cx, cy, rOuter, endAngle);
    const s2 = polarToXY(cx, cy, rInner, endAngle);
    const e2 = polarToXY(cx, cy, rInner, startAngle);
    const la = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return [
      `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${la} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
      `L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${la} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  // Grille
  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(pct => {
    const r = innerR + pct * (maxR - innerR);
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.06"/>`;
  }).join('');

  const segmentsSVG = segments.map((seg, i) => {
    const path = describeSegment(cx, cy, innerR, seg.outerR, seg.startAngle, seg.endAngle);
    const bgPath = describeSegment(cx, cy, innerR, maxR + 5, seg.startAngle, seg.endAngle);
    return `
      <path d="${bgPath}" fill="${seg.color}" opacity="0.06"/>
      <path d="${path}" fill="${seg.color}" opacity="0.88"
        class="seg" data-idx="${i}" style="cursor:pointer;"/>
    `;
  }).join('');

  const viewSize = 480;

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
      background: #0d0d14;
      color: #eaeaea;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0 8px;
    }
    svg { overflow: visible; width: 100%; max-width: 480px; }
    .seg { transition: opacity 0.15s, filter 0.15s; }
    .seg:hover { opacity: 0.7 !important; filter: brightness(1.3); }
    .seg.active { filter: brightness(1.4); opacity: 1 !important; }

    /* Tooltip centré dans le SVG */
    .tooltip-overlay {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15,15,25,0.95);
      border: 1px solid #2a2a5a;
      border-radius: 14px;
      padding: 14px 18px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      min-width: 160px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.7);
    }
    .tooltip-overlay.visible { opacity: 1; }
    .tt-label { font-size: 12px; color: #888; margin-bottom: 6px; }
    .tt-amount { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
    .tt-ratio { font-size: 12px; color: #555; }

    .svg-wrap { position: relative; width: 100%; max-width: 480px; }
  </style>
</head>
<body>

  <div class="svg-wrap">
    <svg viewBox="0 0 ${viewSize} ${viewSize}">
      <defs>
        <filter id="centerGlow">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Grille -->
      ${gridCircles}

      <!-- Segments -->
      ${segmentsSVG}

      <!-- Cercle centre -->
      <circle cx="${cx}" cy="${cy}" r="${innerR + 2}" fill="#0d0d14" filter="url(#centerGlow)"/>
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#111118"/>

      <!-- Texte centre -->
      <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="10" fill="#444"
        font-family="-apple-system, sans-serif" letter-spacing="1.5">TOTAL</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="15" font-weight="700"
        fill="#eaeaea" font-family="-apple-system, sans-serif"
      >${total.toLocaleString('fr-FR')} €</text>
    </svg>

    <!-- Tooltip centré -->
    <div class="tooltip-overlay" id="tooltip">
      <div class="tt-label" id="tt-label"></div>
      <div class="tt-amount" id="tt-amount"></div>
      <div class="tt-ratio" id="tt-ratio"></div>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(segments.map(s => ({
      label: s.label, montant: s.montant, ratio: s.ratio, color: s.color
    })))};

    const tooltip = document.getElementById('tooltip');
    let activeIdx = null;

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(seg.dataset.idx);
        const d = data[idx];

        // Reset autres
        document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
        seg.classList.add('active');
        activeIdx = idx;

        document.getElementById('tt-label').textContent = d.label;
        document.getElementById('tt-amount').textContent = d.montant.toLocaleString('fr-FR') + ' €';
        document.getElementById('tt-amount').style.color = d.color;
        document.getElementById('tt-ratio').textContent = d.ratio + '% des dépenses';
        tooltip.classList.add('visible');

        clearTimeout(window._tt);
        window._tt = setTimeout(() => {
          tooltip.classList.remove('visible');
          document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
          activeIdx = null;
        }, 3000);
      });
    });

    document.addEventListener('click', () => {
      tooltip.classList.remove('visible');
      document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
      activeIdx = null;
    });
  </script>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
