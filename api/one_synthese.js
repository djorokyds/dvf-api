module.exports = async function handler(req, res) {
  const { categories, depenses_total } = req.query;

  if (!categories || !depenses_total) {
    return res.status(400).json({ error: "Paramètres manquants (categories, depenses_total)" });
  }

  // Nettoyage robuste
  const total = parseFloat(depenses_total.replace(/[€\s\u00a0]/g, '').replace(',', '.'));

  const items = categories.split('/').map(item => {
    // Trouver le dernier | comme séparateur label|montant
    const lastPipe = item.lastIndexOf('|');
    if (lastPipe === -1) return null;
    const label = item.substring(0, lastPipe).trim();
    const montantRaw = item.substring(lastPipe + 1).replace(/[€\s\u00a0]/g, '').replace(',', '.');
    const montant = parseFloat(montantRaw);
    const ratio = Math.round((montant / total) * 100);
    return { label, montant, ratio };
  }).filter(i => i && i.label && !isNaN(i.montant) && i.montant > 0);

  if (items.length === 0) {
    return res.status(400).json({ error: "Aucune catégorie valide trouvée", raw: categories });
  }

  const colors = [
    '#7B5EA7', '#4A90D9', '#3DBFA0', '#5B8DD9',
    '#A07BC4', '#2E9E8A', '#6B7FD4', '#4ABFBF',
  ];

  const n = items.length;
  const cx = 180, cy = 180;
  const innerR = 55;
  const maxR = 145;
  const gapAngle = 3;
  const totalAngle = 360 - n * gapAngle;
  const startAngle = -90;

  let currentAngle = startAngle;
  const segments = items.map((item, i) => {
    const segAngle = (item.ratio / 100) * totalAngle;
    const seg = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + segAngle,
      color: colors[i % colors.length],
      outerR: innerR + ((item.ratio / Math.max(...items.map(x => x.ratio))) * (maxR - innerR)),
    };
    currentAngle += segAngle + gapAngle;
    return seg;
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

  function getLabelLine(seg) {
    const midAngle = (seg.startAngle + seg.endAngle) / 2;
    const p1 = polarToXY(cx, cy, seg.outerR + 4, midAngle);
    const p3 = polarToXY(cx, cy, seg.outerR + 80, midAngle);
    const isRight = p3.x >= cx;
    const lineEndX = isRight ? p3.x + 40 : p3.x - 40;
    return { p1, p3, lineEndX, isRight };
  }

  const segmentsSVG = segments.map((seg, i) => {
    const path = describeSegment(cx, cy, innerR, seg.outerR, seg.startAngle, seg.endAngle);
    const bgPath = describeSegment(cx, cy, innerR, maxR, seg.startAngle, seg.endAngle);
    return `
      <path d="${bgPath}" fill="${seg.color}" opacity="0.12"/>
      <path d="${path}" fill="${seg.color}" opacity="0.85" class="seg" data-idx="${i}"/>
    `;
  }).join('');

  const labelsSVG = segments.map((seg, i) => {
    const { p1, p3, lineEndX, isRight } = getLabelLine(seg);
    const textX = isRight ? lineEndX + 6 : lineEndX - 6;
    const anchor = isRight ? 'start' : 'end';
    const label = seg.label.length > 16 ? seg.label.substring(0, 15) + '…' : seg.label;
    return `
      <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}"
            x2="${p3.x.toFixed(1)}" y2="${p3.y.toFixed(1)}"
            stroke="${seg.color}" stroke-width="1.2" opacity="0.6"/>
      <line x1="${p3.x.toFixed(1)}" y1="${p3.y.toFixed(1)}"
            x2="${lineEndX.toFixed(1)}" y2="${p3.y.toFixed(1)}"
            stroke="${seg.color}" stroke-width="1.2" opacity="0.6"/>
      <text x="${textX.toFixed(1)}" y="${(p3.y - 7).toFixed(1)}"
        text-anchor="${anchor}" font-size="13" font-weight="800"
        fill="${seg.color}" font-family="-apple-system, sans-serif"
      >${seg.ratio}%</text>
      <text x="${textX.toFixed(1)}" y="${(p3.y + 10).toFixed(1)}"
        text-anchor="${anchor}" font-size="11" font-weight="600"
        fill="#999" font-family="-apple-system, sans-serif"
      >${label}</text>
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
      background: #111118;
      color: #eaeaea;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0 16px;
    }
    svg { overflow: visible; }
    .seg { cursor: pointer; transition: opacity 0.2s; }
    .seg:hover { opacity: 1 !important; filter: brightness(1.25); }
    .tooltip {
      position: fixed;
      background: #1e1e2e;
      border: 1px solid #333355;
      border-radius: 10px;
      padding: 10px 14px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      min-width: 140px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .tooltip.visible { opacity: 1; }
    .tt-label { font-size: 11px; color: #888; margin-bottom: 4px; }
    .tt-amount { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .tt-ratio { font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <svg viewBox="-100 -20 560 400" width="100%" style="max-width:520px">
    ${segmentsSVG}
    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#1a1a28"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="#111118"/>
    <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="11" fill="#555"
      font-family="-apple-system, sans-serif">TOTAL</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="15" font-weight="700"
      fill="#eaeaea" font-family="-apple-system, sans-serif"
    >${total.toLocaleString('fr-FR')} €</text>
    ${labelsSVG}
  </svg>

  <div class="tooltip" id="tooltip">
    <div class="tt-label" id="tt-label"></div>
    <div class="tt-amount" id="tt-amount"></div>
    <div class="tt-ratio" id="tt-ratio"></div>
  </div>

  <script>
    const data = ${JSON.stringify(segments.map(s => ({ label: s.label, montant: s.montant, ratio: s.ratio, color: s.color })))};
    const tooltip = document.getElementById('tooltip');

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        const idx = parseInt(seg.dataset.idx);
        const d = data[idx];
        document.getElementById('tt-label').textContent = d.label;
        document.getElementById('tt-amount').textContent = d.montant.toLocaleString('fr-FR') + ' €';
        document.getElementById('tt-amount').style.color = d.color;
        document.getElementById('tt-ratio').textContent = d.ratio + '% des dépenses';
        tooltip.style.left = Math.min(e.clientX + 12, window.innerWidth - 160) + 'px';
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
