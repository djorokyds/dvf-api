module.exports = async function handler(req, res) {
  const { categories, depenses_total } = req.query;

  if (!categories || !depenses_total) {
    return res.status(400).json({ error: "Paramètres manquants (categories, depenses_total)" });
  }

  const total = parseFloat(depenses_total.replace(/[€\s\u00a0]/g, '').replace(',', '.'));

  const items = categories.split('/').map(item => {
    const lastPipe = item.lastIndexOf('|');
    if (lastPipe === -1) return null;
    const label = item.substring(0, lastPipe).trim();
    const montantRaw = item.substring(lastPipe + 1).replace(/[€\s\u00a0]/g, '').replace(',', '.');
    const montant = parseFloat(montantRaw);
    const ratio = Math.round((montant / total) * 100);
    return { label, montant, ratio };
  }).filter(i => i && i.label && !isNaN(i.montant) && i.montant > 0);

  if (items.length === 0) {
    return res.status(400).json({ error: "Aucune catégorie valide", raw: categories });
  }

  const n = items.length;
  const cx = 200, cy = 200;
  const innerR = 35;
  const maxR = 150;
  const segAngle = 360 / n;
  const gapAngle = 2;

  // Dégradé de bleus/violets comme l'image
  const baseColors = [
    '#1a3a6b', '#1e4d8c', '#2260ad', '#2673ce',
    '#3a87d4', '#4f9bda', '#64afe0', '#79c3e6',
    '#3d5a9e', '#5270b8', '#6786d2', '#7c9cec',
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

  const segmentsSVG = segments.map((seg, i) => {
    const path = describeSegment(cx, cy, innerR, seg.outerR, seg.startAngle, seg.endAngle);
    // Fond gris clair jusqu'au maxR
    const bgPath = describeSegment(cx, cy, innerR, maxR + 5, seg.startAngle, seg.endAngle);
    return `
      <path d="${bgPath}" fill="${seg.color}" opacity="0.08"/>
      <path d="${path}" fill="${seg.color}" opacity="0.9" class="seg" data-idx="${i}"
        style="cursor:pointer; transition: opacity 0.2s;"/>
    `;
  }).join('');

  // Cercles de grille
  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(pct => {
    const r = innerR + pct * (maxR - innerR);
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="0.4" opacity="0.08"/>`;
  }).join('');

  // Labels externes
  const labelsSVG = segments.map((seg, i) => {
    const labelR = maxR + 22;
    const pos = polarToXY(cx, cy, labelR, seg.midAngle);
    const isRight = Math.cos(seg.midAngle * Math.PI / 180) >= 0;
    const anchor = isRight ? 'start' : 'end';

    // Ligne du bord du segment au label
    const lineStart = polarToXY(cx, cy, seg.outerR + 4, seg.midAngle);
    const lineEnd = polarToXY(cx, cy, maxR + 14, seg.midAngle);

    const shortLabel = seg.label.length > 14 ? seg.label.substring(0, 13) + '…' : seg.label;

    return `
      <line x1="${lineStart.x.toFixed(1)}" y1="${lineStart.y.toFixed(1)}"
            x2="${lineEnd.x.toFixed(1)}" y2="${lineEnd.y.toFixed(1)}"
            stroke="${seg.color}" stroke-width="1" opacity="0.5"/>
      <text x="${pos.x.toFixed(1)}" y="${(pos.y - 5).toFixed(1)}"
        text-anchor="${anchor}" font-size="11" font-weight="800"
        fill="${seg.color}" font-family="-apple-system, sans-serif"
      >${seg.montant.toLocaleString('fr-FR')} €</text>
      <text x="${pos.x.toFixed(1)}" y="${(pos.y + 8).toFixed(1)}"
        text-anchor="${anchor}" font-size="9" font-weight="500"
        fill="#888" font-family="-apple-system, sans-serif"
      >${shortLabel} · ${seg.ratio}%</text>
    `;
  }).join('');

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
      padding: 8px 0 12px;
    }
    svg { overflow: visible; }
    .seg:hover { opacity: 0.7 !important; }

    .tooltip {
      position: fixed;
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 10px;
      padding: 10px 14px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      min-width: 150px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .tooltip.visible { opacity: 1; }
    .tt-label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .tt-amount { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .tt-ratio { font-size: 11px; color: #555; }
  </style>
</head>
<body>

  <svg viewBox="-80 -80 560 560" width="100%" style="max-width:460px">
    <defs>
      <filter id="centerGlow">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Grille -->
    ${gridCircles}

    <!-- Segments -->
    ${segmentsSVG}

    <!-- Cercle centre -->
    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#0d0d14" filter="url(#centerGlow)"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR - 3}" fill="#111118"/>

    <!-- Texte centre -->
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="9" fill="#444"
      font-family="-apple-system, sans-serif" letter-spacing="1">TOTAL</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="13" font-weight="700"
      fill="#eaeaea" font-family="-apple-system, sans-serif"
    >${total.toLocaleString('fr-FR')} €</text>

    <!-- Labels -->
    ${labelsSVG}
  </svg>

  <div class="tooltip" id="tooltip">
    <div class="tt-label" id="tt-label"></div>
    <div class="tt-amount" id="tt-amount"></div>
    <div class="tt-ratio" id="tt-ratio"></div>
  </div>

  <script>
    const data = ${JSON.stringify(segments.map(s => ({
      label: s.label, montant: s.montant, ratio: s.ratio, color: s.color
    })))};
    const tooltip = document.getElementById('tooltip');

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        const idx = parseInt(seg.dataset.idx);
        const d = data[idx];
        document.getElementById('tt-label').textContent = d.label;
        document.getElementById('tt-amount').textContent = d.montant.toLocaleString('fr-FR') + ' €';
        document.getElementById('tt-amount').style.color = d.color;
        document.getElementById('tt-ratio').textContent = d.ratio + '% des dépenses';
        tooltip.style.left = Math.min(e.clientX + 12, window.innerWidth - 170) + 'px';
        tooltip.style.top = Math.max(e.clientY - 60, 8) + 'px';
        tooltip.classList.add('visible');
        clearTimeout(window._tt);
        window._tt = setTimeout(() => tooltip.classList.remove('visible'), 3000);
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.seg')) tooltip.classList.remove('visible');
    });
  </script>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
