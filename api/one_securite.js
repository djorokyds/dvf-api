module.exports = async function handler(req, res) {
  const { epargne_securite, cible_securite } = req.query;

  if (!epargne_securite || !cible_securite) {
    return res.status(400).json({ error: "Paramètres manquants (epargne_securite, cible_securite)" });
  }

  const epargne = parseFloat(epargne_securite.replace(/\s/g, '').replace(',', '.'));
  const cible = parseFloat(cible_securite.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(150, Math.round((epargne / cible) * 100));

  // Statut
  let statusLabel, statusColor;
  if (pct >= 100) { statusLabel = 'Atteint'; statusColor = '#90EE60'; }
  else if (pct >= 50) { statusLabel = 'En cours'; statusColor = '#F39C12'; }
  else { statusLabel = 'Insuffisant'; statusColor = '#E74C3C'; }

  // Angle aiguille : -135° (0%) → +135° (150%)
  // On limite à 135° max (100%+)
  const angle = -135 + (Math.min(pct, 100) / 100) * 270;

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle, sweep = 1) {
    const s = polarToXY(cx, cy, r, startAngle);
    const e = polarToXY(cx, cy, r, endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  function describeDonut(cx, cy, rO, rI, startAngle, endAngle) {
    const s1 = polarToXY(cx, cy, rO, startAngle);
    const e1 = polarToXY(cx, cy, rO, endAngle);
    const s2 = polarToXY(cx, cy, rI, endAngle);
    const e2 = polarToXY(cx, cy, rI, startAngle);
    const la = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)} A ${rO} ${rO} 0 ${la} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)} L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)} A ${rI} ${rI} 0 ${la} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)} Z`;
  }

  const cx = 130, cy = 120;
  const rO1 = 85, rI1 = 65;  // Arc extérieur (fond)
  const rO2 = 100, rI2 = 80; // Arc milieu (actif)
  const rO3 = 70, rI3 = 55;  // Arc intérieur (fond)

  // Arcs fond gris
  const bgOuter = describeDonut(cx, cy, rO2, rI2, -135, 135);
  const bgInner = describeDonut(cx, cy, rO3, rI3, -135, 135);

  // Arc actif (coloré) selon pct
  const activeAngle = -135 + (Math.min(pct, 100) / 100) * 270;
  const activeOuter = pct > 0 ? describeDonut(cx, cy, rO2, rI2, -135, activeAngle) : '';
  const activeInner = pct > 0 ? describeDonut(cx, cy, rO3, rI3, -135, Math.min(activeAngle, 35)) : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sécurité Financière - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #222;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px;
      min-height: 160px;
      border-radius: 16px;
    }

    /* Partie gauche */
    .left { flex: 1; }
    .status-label {
      font-size: 22px;
      color: #888;
      font-weight: 400;
      margin-bottom: 8px;
    }
    .amount-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .amount-value {
      font-size: 64px;
      font-weight: 700;
      color: ${statusColor};
      line-height: 1;
      letter-spacing: -2px;
    }
    .amount-target {
      font-size: 28px;
      font-weight: 400;
      color: #666;
    }

    /* Partie droite — jauge */
    .right {
      width: 200px;
      height: 140px;
      position: relative;
      flex-shrink: 0;
    }
    svg { overflow: visible; }

    #needle {
      transform-origin: ${cx}px ${cy}px;
      transform: rotate(-135deg);
      transition: transform 1.6s cubic-bezier(0.34, 1.05, 0.64, 1);
    }
    #needle.animated { transform: rotate(${angle}deg); }
  </style>
</head>
<body>

  <!-- Gauche -->
  <div class="left">
    <div class="status-label">${statusLabel}</div>
    <div class="amount-row">
      <div class="amount-value">${Math.round(epargne / 1000) > 0 ? Math.round(epargne / 1000) + 'k' : Math.round(epargne)}</div>
      <div class="amount-target">/${Math.round(cible / 1000) > 0 ? Math.round(cible / 1000) + 'k' : Math.round(cible)}</div>
    </div>
  </div>

  <!-- Droite — jauge -->
  <div class="right">
    <svg viewBox="0 0 260 150" width="200" height="140">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="needleShadow">
          <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/>
        </filter>
        <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${statusColor}" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="${statusColor}" stop-opacity="1"/>
        </linearGradient>
        <linearGradient id="activeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${statusColor}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${statusColor}" stop-opacity="0.6"/>
        </linearGradient>
      </defs>

      <!-- Arc fond extérieur -->
      <path d="${bgOuter}" fill="#2e2e2e"/>

      <!-- Arc fond intérieur -->
      <path d="${bgInner}" fill="#2a2a2a"/>

      <!-- Arc actif extérieur -->
      ${activeOuter ? `<path d="${activeOuter}" fill="url(#activeGrad)" filter="url(#glow)"/>` : ''}

      <!-- Arc actif intérieur -->
      ${activeInner ? `<path d="${activeInner}" fill="url(#activeGrad2)"/>` : ''}

      <!-- Aiguille -->
      <g id="needle" filter="url(#needleShadow)">
        <line
          x1="${cx}" y1="${cy}"
          x2="${cx}" y2="${cy - 88}"
          stroke="white" stroke-width="3"
          stroke-linecap="round"
        />
        <circle cx="${cx}" cy="${cy}" r="10" fill="#1a1a1a" stroke="white" stroke-width="3"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="#1a1a1a"/>
      </g>

    </svg>
  </div>

  <script>
    setTimeout(() => {
      document.getElementById('needle').classList.add('animated');
    }, 300);
  </script>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
