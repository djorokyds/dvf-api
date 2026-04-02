module.exports = async function handler(req, res) {
  const { total_dettes, total_revenus } = req.query;

  if (!total_dettes || !total_revenus) {
    return res.status(400).json({ error: "Paramètres manquants (total_dettes, total_revenus)" });
  }

  const dettes = parseFloat(total_dettes.replace(/\s/g, '').replace(',', '.'));
  const revenus = parseFloat(total_revenus.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(99.99, Math.round((dettes / revenus) * 100));

  const pct_reel = Math.round((dettes / revenus) * 100);

  let color1, color2, colorLight, label;
  if (pct <= 30) {
    color1 = '#27AE60'; color2 = '#1a7a43'; colorLight = 'rgba(39,174,96,0.2)'; label = '✅ Ratio Sain';
  } else if (pct <= 50) {
    color1 = '#F39C12'; color2 = '#b87200'; colorLight = 'rgba(243,156,18,0.2)'; label = '⚠️ Ratio Tendue';
  } else {
    color1 = '#E74C3C'; color2 = '#c0392b'; colorLight = 'rgba(231,76,60,0.2)'; label = '⚠️🚫 Ratio Élevé';
  }

  // Conversion % → angle SVG
  // Cercle commence à -90° (haut), sens horaire
  // pct% = pct/100 * 360°
  const pctAngle = (pct / 100) * 360;

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToXY(cx, cy, r, startAngle);
    const end = polarToXY(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function describeDonut(cx, cy, rOuter, rInner, startAngle, endAngle) {
    const s1 = polarToXY(cx, cy, rOuter, startAngle);
    const e1 = polarToXY(cx, cy, rOuter, endAngle);
    const s2 = polarToXY(cx, cy, rInner, endAngle);
    const e2 = polarToXY(cx, cy, rInner, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
      `L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  const cx = 160, cy = 160;
  const rOuter = 130, rInner = 85, rOuterBig = 145;

  // Arc de fond (gris) — 360°
  const bgPath = describeDonut(cx, cy, rOuter, rInner, 0.5, 359.5);

  // Arc dette (coloré) — de 0 à pctAngle
  const debtePath = pctAngle > 0 ? describeDonut(cx, cy, rOuterBig, rInner, 0, pctAngle) : '';

  // Zone triangulaire light (fond clair du secteur)
  const midAngle = pctAngle / 2;
  const tipX = cx, tipY = cy;
  const arcLightStart = polarToXY(cx, cy, rOuter, 0);
  const arcLightEnd = polarToXY(cx, cy, rOuter, pctAngle);
  const lightLargeArc = pctAngle > 180 ? 1 : 0;
  const lightPath = pctAngle > 0 ? `M ${tipX} ${tipY} L ${arcLightStart.x.toFixed(2)} ${arcLightStart.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${lightLargeArc} 1 ${arcLightEnd.x.toFixed(2)} ${arcLightEnd.y.toFixed(2)} Z` : '';

  // Label position (milieu de l'arc)
  const labelPos = polarToXY(cx, cy, (rOuter + rInner) / 2 + 10, midAngle);

  // Ligne séparatrice verticale
  const topSep = polarToXY(cx, cy, rOuterBig + 6, 0);
  const botSep = polarToXY(cx, cy, rInner - 6, 0);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dette - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #171717;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    svg { overflow: visible; }
  </style>
</head>
<body>

  <svg viewBox="0 0 320 320" width="320" height="320" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Gradient arc dette -->
      <linearGradient id="debtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${color2}" stop-opacity="1"/>
      </linearGradient>

      <!-- Gradient glow extérieur -->
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      <!-- Shadow donut bg -->
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Arc de fond gris -->
    <path d="${bgPath}" fill="#2a2a2a" filter="url(#shadow)"/>

    <!-- Zone claire secteur dette -->
    ${lightPath ? `<path d="${lightPath}" fill="${colorLight}"/>` : ''}

    <!-- Arc dette coloré (plus grand rayon) -->
    ${debtePath ? `<path d="${debtePath}" fill="url(#debtGrad)" filter="url(#glow)"/>` : ''}

    <!-- Ligne séparatrice -->
    <line
      x1="${topSep.x.toFixed(2)}" y1="${topSep.y.toFixed(2)}"
      x2="${botSep.x.toFixed(2)}" y2="${botSep.y.toFixed(2)}"
      stroke="#1a1a1a" stroke-width="3"
    />

    <!-- Label % dans l'arc -->
    ${pct > 5 ? `
    <text
      x="${labelPos.x.toFixed(2)}"
      y="${(labelPos.y + 6).toFixed(2)}"
      text-anchor="middle"
      font-size="18"
      font-weight="700"
      fill="${color1}"
      font-family="-apple-system, sans-serif"
    >${pct_reel}%</text>
    ` : ''}

    <!-- Label centre -->
    <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="13" font-weight="700" fill="#eaeaea" font-family="-apple-system, sans-serif">
      ${dettes.toLocaleString('fr-FR')} €
    </text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="10" fill="#eaeaea" font-family="-apple-system, sans-serif">
      DETTES
    </text>
    <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="10" font-weight="700" fill="${color1}" font-family="-apple-system, sans-serif">
      ${label}
    </text>

    <!-- Revenus en bas -->
    <text x="${cx}" y="350" text-anchor="middle" font-size="11" fill="#555" font-family="-apple-system, sans-serif">
      Revenus : ${revenus.toLocaleString('fr-FR')} €
    </text>

  </svg>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
