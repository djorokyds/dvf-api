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

  const mainItems = rawItems.filter(i => i.ratio >= 3);
  const autresItems = rawItems.filter(i => i.ratio < 3);
  const autresMontant = autresItems.reduce((s, i) => s + i.montant, 0);
  const autresRatio = Math.round((autresMontant / total) * 100);

  const items = autresMontant > 0
    ? [...mainItems, { label: 'Autres', montant: autresMontant, ratio: autresRatio, isAutres: true }]
    : mainItems;

  if (items.length === 0) {
    return res.status(400).json({ error: "Aucune catégorie valide" });
  }

  const n = items.length;
  const cx = 240, cy = 240;
  const innerR = 50;
  const maxR = 200;
  const segAngle = 360 / n;
  const gapAngle = 1.5;

  // Dégradé orange / marron basé sur la couleur principale C38F5A
  const blueColors = [
    '#FF7A1A', // orange vif
    '#F97316', // orange
    '#E86A12',
    '#D9600F',
    '#C38F5A', // couleur principale
    '#B57F4F',
    '#A06F45',
    '#8B5F3A',
    '#754F30',
    '#5F4027',
    '#49311D',
    '#342214'
  ];
  
  const goldColors = [
    '#FF7A1A',
    '#F59E0B',
    '#C38F5A',
    '#8B5E2A',
  ];

  const maxMontant = Math.max(...items.map(i => i.montant));

  const segments = items.map((item, i) => {
    const startAngle = -90 + i * segAngle;
    const endAngle = startAngle + segAngle - gapAngle;
    const outerR = innerR + ((item.montant / maxMontant) * (maxR - innerR));
    const color = item.isAutres
      ? goldColors[0]
      : blueColors[i % blueColors.length];
    return {
      ...item,
      startAngle,
      endAngle,
      outerR,
      color,
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

  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(pct => {
    const r = innerR + pct * (maxR - innerR);
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.06"/>`;
  }).join('');

  const segmentsSVG = segments.map((seg, i) => {
    const path = describeSegment(cx, cy, innerR, seg.outerR, seg.startAngle, seg.endAngle);
    const bgPath = describeSegment(cx, cy, innerR, maxR + 5, seg.startAngle, seg.endAngle);
    return `
      <path d="${bgPath}" fill="#919191" opacity="0.2"/>
      <path d="${path}" fill="${seg.color}" opacity="0.88"
        class="seg" data-idx="${i}" data-autres="${seg.isAutres ? '1' : '0'}"
        style="cursor:pointer;"/>
    `;
  }).join('');

  // Données "Autres" détaillées pour le tooltip
  const autresDetail = autresItems
    .sort((a, b) => b.montant - a.montant)
    .map(i => `${i.label} : ${i.montant.toLocaleString('fr-FR')} € (${i.ratio}%)`)
    .join('\n');

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
      background: #1f1f1f;
      color: #eaeaea;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
    }
    svg { overflow: visible; width: 100%; max-width: 480px; }
    .seg { transition: opacity 0.15s, filter 0.15s; }
    .seg:hover { opacity: 0.7 !important; filter: brightness(1.3); }
    .seg.active { filter: brightness(1.4); opacity: 1 !important; }

    .svg-wrap { position: relative; width: 100%; max-width: 480px; }

    .tooltip-overlay {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(13,13,20,0.97);
      border: 1px solid #D95F09;
      border-radius: 14px;
      padding: 14px 18px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      min-width: 180px;
      max-width: 220px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.8);
    }
    .tooltip-overlay.visible { opacity: 1; }
    .tt-label { font-size: 12px; color: #888; margin-bottom: 6px; }
    .tt-amount { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .tt-ratio { font-size: 12px; color: #888; margin-bottom: 8px; }
    .tt-detail {
      font-size: 10px;
      color: #666;
      text-align: left;
      line-height: 1.8;
      border-top: 1px solid #222;
      padding-top: 8px;
      margin-top: 4px;
      white-space: pre-line;
    }
    .tt-detail-item {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      color: #666;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="svg-wrap">
    <svg viewBox="0 0 480 480">
      <defs>
        <filter id="centerGlow">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E8C27A"/>
          <stop offset="100%" stop-color="#8B5E2A"/>
        </linearGradient>
      </defs>

      ${gridCircles}
      ${segmentsSVG}

      <circle cx="${cx}" cy="${cy}" r="${innerR + 2}" fill="#0d0d14" filter="url(#centerGlow)"/>
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#111118"/>
      <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="14" fill="#888"
        font-family="-apple-system, sans-serif" letter-spacing="1.5">TOTAL</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="17" font-weight="700"
        fill="#eaeaea" font-family="-apple-system, sans-serif"
      >${total.toLocaleString('fr-FR')} €</text>
    </svg>

    <div class="tooltip-overlay" id="tooltip">
      <div class="tt-label" id="tt-label"></div>
      <div class="tt-amount" id="tt-amount"></div>
      <div class="tt-ratio" id="tt-ratio"></div>
      <div id="tt-detail"></div>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(segments.map(s => ({
      label: s.label,
      montant: s.montant,
      ratio: s.ratio,
      color: s.color,
      isAutres: s.isAutres || false
    })))};

    const autresItems = ${JSON.stringify(autresItems)};
    const tooltip = document.getElementById('tooltip');

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(seg.dataset.idx);
        const d = data[idx];

        document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
        seg.classList.add('active');

        document.getElementById('tt-label').textContent = d.label;
        document.getElementById('tt-amount').textContent = d.montant.toLocaleString('fr-FR') + ' €';
        document.getElementById('tt-amount').style.color = d.color;
        document.getElementById('tt-ratio').textContent = d.ratio + '% des dépenses';

        // Si "Autres" → afficher le détail
        const detailEl = document.getElementById('tt-detail');
        if (d.isAutres && autresItems.length > 0) {
          const sorted = [...autresItems].sort((a, b) => b.montant - a.montant);
          detailEl.innerHTML = '<div style="border-top:1px solid #222;padding-top:8px;margin-top:6px">' +
            sorted.map(i =>
              '<div style="display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#888;line-height:1.8">' +
              '<span>' + i.label + '</span>' +
              '<span style="color:#C38F5A;font-weight:600">' + i.montant.toLocaleString('fr-FR') + ' €</span>' +
              '</div>'
            ).join('') +
          '</div>';
        } else {
          detailEl.innerHTML = '';
        }

        tooltip.classList.add('visible');
        clearTimeout(window._tt);
        window._tt = setTimeout(() => {
          tooltip.classList.remove('visible');
          document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
        }, 4000);
      });
    });

    document.addEventListener('click', () => {
      tooltip.classList.remove('visible');
      document.querySelectorAll('.seg').forEach(s => s.classList.remove('active'));
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
