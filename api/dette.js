module.exports = async function handler(req, res) {
  const { total_dettes, total_revenus } = req.query;

  if (!total_dettes || !total_revenus) {
    return res.status(400).json({ error: "Paramètres manquants (total_dettes, total_revenus)" });
  }

  const dettes = parseFloat(total_dettes.replace(/\s/g, '').replace(',', '.'));
  const revenus = parseFloat(total_revenus.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(100, Math.round((dettes / revenus) * 100));

  let color1, color2, colorLight, label;
  if (pct <= 30) {
    color1 = '#27AE60'; color2 = '#1a7a43'; colorLight = 'rgba(39,174,96,0.2)'; label = 'Sain';
  } else if (pct <= 50) {
    color1 = '#F39C12'; color2 = '#b87200'; colorLight = 'rgba(243,156,18,0.2)'; label = 'Attention';
  } else {
    color1 = '#E74C3C'; color2 = '#c0392b'; colorLight = 'rgba(231,76,60,0.2)'; label = 'Élevé';
  }

  const pctAngle = (pct / 100) * 360;

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
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

  const bgPath = describeDonut(cx, cy, rOuter, rInner, 0.5, 359.5);
  const debtePath = pctAngle > 0 ? describeDonut(cx, cy, rOuterBig, rInner, 0, pctAngle) : '';

  const arcLightStart = polarToXY(cx, cy, rOuter, 0);
  const arcLightEnd = polarToXY(cx, cy, rOuter, pctAngle);
  const lightLargeArc = pctAngle > 180 ? 1 : 0;
  const lightPath = pctAngle > 0
    ? `M ${cx} ${cy} L ${arcLightStart.x.toFixed(2)} ${arcLightStart.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${lightLargeArc} 1 ${arcLightEnd.x.toFixed(2)} ${arcLightEnd.y.toFixed(2)} Z`
    : '';

  const topSep = polarToXY(cx, cy, rOuterBig + 6, 0);
  const botSep = polarToXY(cx, cy, rInner - 6, 0);

  // Tout fixe — haut gauche
  const pointX = 95, pointY = 62;
  const cornerX = 60, cornerY = 45;
  const lineEndX = 130;
  const textX = 62;

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
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    svg { overflow: visible; }
  </style>
</head>
<body>
  <svg viewBox="20 20 280 300" width="320" height="340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="debtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${color2}" stop-opacity="1"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Arc fond gris -->
    <path d="${bgPath}" fill="#2a2a2a" filter="url(#shadow)"/>

    <!-- Zone claire -->
    ${lightPath ? `<path d="${lightPath}" fill="${colorLight}"/>` : ''}

    <!-- Arc dette -->
    ${debtePath ? `<path d="${debtePath}" fill="url(#debtGrad)" filter="url(#glow)"/>` : ''}

    <!-- Séparateur -->
    <line
      x1="${topSep.x.toFixed(2)}" y1="${topSep.y.toFixed(2)}"
      x2="${botSep.x.toFixed(2)}" y2="${botSep.y.toFixed(2)}"
      stroke="#1a1a1a" stroke-width="3"
    />

    <!-- Point fixe + ligne coudée fixe + label -->
    <circle cx="${pointX}" cy="${pointY}" r="4" fill="${color1}"/>
    <polyline
      points="${pointX},${pointY} ${cornerX},${cornerY} ${lineEndX},${cornerY}"
      fill="none" stroke="${color1}" stroke-width="1.5"
    />
    <text
      x="${textX}" y="${cornerY - 6}"
      text-anchor="start"
      font-size="22" font-weight="800" fill="#eaeaea"
      font-family="-apple-system, sans-serif"
    >${pct}%</text>
    <text
      x="${textX}" y="${cornerY + 10}"
      text-anchor="start"
      font-size="10" fill="${color1}"
      font-family="-apple-system, sans-serif"
      font-weight="600"
    >${label} · ${dettes.toLocaleString('fr-FR')} €</text>

    <!-- Centre -->
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="11" fill="#555" font-family="-apple-system, sans-serif">REVENUS</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="14" font-weight="700" fill="#eaeaea" font-family="-apple-system, sans-serif">${revenus.toLocaleString('fr-FR')} €</text>

  </svg>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
