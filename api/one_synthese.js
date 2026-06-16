module.exports = async function handler(req, res) {
  const { categories, depenses_total } = req.query;

  if (!categories || !depenses_total) {
    return res.status(400).json({ error: "Paramètres manquants (categories, depenses_total)" });
  }

  const total = parseFloat(
    depenses_total.replace(/[€\s\u00a0]/g, '').replace(',', '.')
  );

  let items = categories.split('/').map(item => {
    const lastPipe = item.lastIndexOf('|');
    if (lastPipe === -1) return null;

    const label = item.substring(0, lastPipe).trim();
    const montantRaw = item.substring(lastPipe + 1)
      .replace(/[€\s\u00a0]/g, '')
      .replace(',', '.');

    const montant = parseFloat(montantRaw);
    const ratio = Math.round((montant / total) * 100);

    return { label, montant, ratio };
  }).filter(i => i && i.label && !isNaN(i.montant) && i.montant > 0);

  if (items.length === 0) {
    return res.status(400).json({ error: "Aucune catégorie valide trouvée", raw: categories });
  }

  // Petits arcs d'abord pour les placer en haut
  const smallItems = items
    .filter(i => i.ratio <= 10)
    .sort((a, b) => a.ratio - b.ratio);

  const largeItems = items
    .filter(i => i.ratio > 10)
    .sort((a, b) => b.ratio - a.ratio);

  items = [...smallItems, ...largeItems];

  const smallColors = [
    '#FF6B9A',
    '#FFB86B',
    '#FFD166',
    '#4DD4AC',
    '#7CE7FF',
    '#C084FC',
  ];

  const largeColors = [
    '#6D28D9',
    '#2563EB',
    '#047857',
    '#1E40AF',
    '#5B21B6',
  ];

  const n = items.length;
  const cx = 180;
  const cy = 180;
  const innerR = 55;
  const maxR = 145;
  const gapAngle = 2;
  const totalAngle = 360 - n * gapAngle;

  // Départ haut-gauche : les petits arcs occupent la zone supérieure
  const startAngle = -135;

  const maxRatio = Math.max(...items.map(x => x.ratio));
  let currentAngle = startAngle;

  const segments = items.map((item, i) => {
    const segAngle = (item.ratio / 100) * totalAngle;

    const isSmall = item.ratio <= 10;
    const color = isSmall
      ? smallColors[i % smallColors.length]
      : largeColors[i % largeColors.length];

    const seg = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + segAngle,
      color,
      outerR: innerR + ((item.ratio / maxRatio) * (maxR - innerR)),
    };

    currentAngle += segAngle + gapAngle;
    return seg;
  });

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
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
      'Z',
    ].join(' ');
  }

  function getLabelLine(seg) {
    const midAngle = (seg.startAngle + seg.endAngle) / 2;
    const p1 = polarToXY(cx, cy, seg.outerR + 6, midAngle);
    const p2 = polarToXY(cx, cy, seg.outerR + 95, midAngle);

    const isRight = p2.x >= cx;
    const lineEndX = isRight ? p2.x + 70 : p2.x - 70;

    return { p1, p2, lineEndX, isRight };
  }

  const segmentsSVG = segments.map((seg, i) => {
    const path = describeSegment(cx, cy, innerR, seg.outerR, seg.startAngle, seg.endAngle);
    const bgPath = describeSegment(cx, cy, innerR, maxR, seg.startAngle, seg.endAngle);

    return `
      <path d="${bgPath}" fill="${seg.color}" opacity="0.14"/>
      <path d="${path}" fill="${seg.color}" opacity="0.9" class="seg" data-idx="${i}"/>
    `;
  }).join('');

  const labelsSVG = segments.map(seg => {
    const { p1, p2, lineEndX, isRight } = getLabelLine(seg);

    const textX = isRight ? lineEndX + 14 : lineEndX - 14;
    const anchor = isRight ? 'start' : 'end';
    const label = seg.label.length > 18 ? seg.label.substring(0, 17) + '…' : seg.label;

    return `
      <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}"
            x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"
            stroke="${seg.color}" stroke-width="1.3" opacity="0.75"/>

      <line x1="${p2.x.toFixed(1)}" y1="${p2.y.toFixed(1)}"
            x2="${lineEndX.toFixed(1)}" y2="${p2.y.toFixed(1)}"
            stroke="${seg.color}" stroke-width="1.3" opacity="0.75"/>

      <text x="${textX.toFixed(1)}" y="${(p2.y - 7).toFixed(1)}"
        text-anchor="${anchor}" font-size="13" font-weight="800"
        fill="${seg.color}" font-family="-apple-system, sans-serif"
      >${seg.ratio}%</text>

      <text x="${textX.toFixed(1)}" y="${(p2.y + 10).toFixed(1)}"
        text-anchor="${anchor}" font-size="11" font-weight="600"
        fill="#aaa" font-family="-apple-system, sans-serif"
      >${label}</text>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Synthèse - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%;
      height: auto;
      overflow: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #111118;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 0 16px;
    }

    svg {
      overflow: visible;
    }

    .seg {
      cursor: pointer;
      transition: opacity 0.2s, filter 0.2s;
    }

    .seg:hover {
      opacity: 1 !important;
      filter: brightness(1.25);
    }

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

    .tooltip.visible {
      opacity: 1;
    }

    .tt-label {
      font-size: 11px;
      color: #888;
      margin-bottom: 4px;
    }

    .tt-amount {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .tt-ratio {
      font-size: 11px;
      color: #555;
    }
  </style>
</head>

<body>
  <svg viewBox="-170 -70 700 500" width="100%" style="max-width:660px">
    ${segmentsSVG}

    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#1a1a28"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="#111118"/>

    <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="11" fill="#555"
      font-family="-apple-system, sans-serif">TOTAL</text>

    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="15" font-weight="700"
      fill="#eaeaea" font-family="-apple-system, sans-serif"
    >${Math.round(total)} €</text>

    ${labelsSVG}
  </svg>

  <div class="tooltip" id="tooltip">
    <div class="tt-label" id="tt-label"></div>
    <div class="tt-amount" id="tt-amount"></div>
    <div class="tt-ratio" id="tt-ratio"></div>
  </div>

  <script>
    const data = ${JSON.stringify(
      segments.map(s => ({
        label: s.label,
        montant: s.montant,
        ratio: s.ratio,
        color: s.color,
      }))
    )};

    const tooltip = document.getElementById('tooltip');

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        const idx = parseInt(seg.dataset.idx);
        const d = data[idx];

        document.getElementById('tt-label').textContent = d.label;
        document.getElementById('tt-amount').textContent = Math.round(d.montant) + ' €';
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
      if (!e.target.closest('.seg')) {
        tooltip.classList.remove('visible');
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
