module.exports = async function handler(req, res) {
  const { epargne_securite, cible_securite } = req.query;

  if (!epargne_securite || !cible_securite) {
    return res.status(400).json({ error: "Paramètres manquants (epargne_securite, cible_securite)" });
  }

  const epargne = parseFloat(epargne_securite.replace(/\s/g, '').replace(',', '.'));
  const cible = parseFloat(cible_securite.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(100, Math.round((epargne / cible) * 100));

  let barColor1, barColor2, statusLabel;
  if (pct >= 100) {
    barColor1 = '#27AE60'; barColor2 = '#2ecc71'; statusLabel = '✓ Matelas atteint';
  } else if (pct >= 50) {
    barColor1 = '#C8B400'; barColor2 = '#f0d000'; statusLabel = 'En cours de constitution';
  } else {
    barColor1 = '#E74C3C'; barColor2 = '#ff6b6b'; statusLabel = 'Matelas insuffisant';
  }

  // 40 barreaux
  const totalBars = 40;
  const activeBars = Math.round((pct / 100) * totalBars);

  const bars = Array.from({ length: totalBars }, (_, i) => {
    const active = i < activeBars;
    return { active, index: i };
  });

  const barsHTML = bars.map(b => {
    if (b.active) {
      return `<div class="bar active" style="
        background: linear-gradient(180deg, ${barColor2}, ${barColor1});
        box-shadow: 0 0 6px ${barColor2}88, 0 0 12px ${barColor1}44;
      "></div>`;
    } else {
      return `<div class="bar inactive"></div>`;
    }
  }).join('');

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
      background: #111;
      color: #eaeaea;
      padding: 20px 16px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    /* Marqueurs */
    .markers {
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding: 0 2px;
      margin-bottom: 6px;
    }
    .marker {
      font-size: 11px;
      color: #555;
      font-weight: 500;
    }

    /* Barreaux */
    .bars-wrap {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      width: 100%;
      height: 60px;
      padding: 0 2px;
    }
    .bar {
      flex: 1;
      border-radius: 3px 3px 2px 2px;
    }
    .bar.active {
      height: 100%;
    }
    .bar.inactive {
      height: 85%;
      background: #2a2a2a;
      border-radius: 3px 3px 2px 2px;
    }

    /* Valeur */
    .amount-section {
      margin-top: 20px;
      display: flex;
      align-items: baseline;
      gap: 14px;
      width: 100%;
      padding: 0 4px;
    }
    .amount-main {
      font-size: 52px;
      font-weight: 700;
      color: #eaeaea;
      letter-spacing: -2px;
      line-height: 1;
    }
    .amount-euro {
      font-size: 36px;
      font-weight: 400;
      color: #888;
    }
    .amount-right {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .amount-label {
      font-size: 12px;
      color: #666;
      line-height: 1.3;
    }
    .amount-cible {
      font-size: 13px;
      font-weight: 600;
      color: #555;
    }

    /* Status */
    .status {
      margin-top: 10px;
      font-size: 12px;
      color: ${barColor2};
      font-weight: 500;
      width: 100%;
      padding: 0 4px;
    }

    /* Pct indicator */
    .pct-indicator {
      position: relative;
      width: 100%;
      margin-top: 4px;
    }
    .pct-line {
      position: absolute;
      left: calc(${pct}% - 1px);
      top: -68px;
      width: 1px;
      height: 60px;
      background: rgba(255,255,255,0.15);
      pointer-events: none;
    }
    .pct-dot {
      position: absolute;
      left: calc(${pct}% - 4px);
      top: -72px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      opacity: 0.6;
    }
  </style>
</head>
<body>

  <!-- Marqueurs 0 25 50 75 100 -->
  <div class="markers">
    <span class="marker">0</span>
    <span class="marker">25</span>
    <span class="marker">50</span>
    <span class="marker">75</span>
    <span class="marker">100</span>
  </div>

  <!-- Barreaux -->
  <div class="bars-wrap" style="position:relative">
    ${barsHTML}
    <!-- Indicateur position actuelle -->
    <div class="pct-line"></div>
    <div class="pct-dot"></div>
  </div>

  <!-- Montant -->
  <div class="amount-section">
    <div class="amount-main">
      <span class="amount-euro">€</span>${epargne.toLocaleString('fr-FR')}
    </div>
    <div class="amount-right">
      <div class="amount-label">constitué sur</div>
      <div class="amount-cible">${cible.toLocaleString('fr-FR')} € visés</div>
    </div>
  </div>

  <div class="status">${pct}% · ${statusLabel}</div>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
