module.exports = async function handler(req, res) {
  const { epargne_disponible, matelas, revenu_moyen } = req.query;

  if (!epargne_disponible || !matelas || !revenu_moyen) {
    return res.status(400).json({ error: "Paramètres manquants (epargne_disponible, matelas, revenu_moyen)" });
  }

  const epargne = parseFloat(epargne_disponible.replace(/\s/g, '').replace(',', '.'));
  const cible = parseFloat(matelas.replace(/\s/g, '').replace(',', '.'));
  const revenu = parseFloat(revenu_moyen.replace(/\s/g, '').replace(',', '.'));

  const pct = Math.min(100, Math.round((epargne / cible) * 100));
  const tauxCouverture = Math.round((epargne / revenu) * 10) / 10;
  const dispoInvest = Math.max(0, epargne - cible);

  let barColor1, barColor2, statusLabel;
  if (pct >= 100) {
    barColor1 = '#27AE60'; barColor2 = '#2ecc71'; statusLabel = '✅ Matelas atteint';
  } else if (pct >= 50) {
    barColor1 = '#C8B400'; barColor2 = '#f0d000'; statusLabel = '⌛ En cours de constitution';
  } else {
    barColor1 = '#E74C3C'; barColor2 = '#ff6b6b'; statusLabel = '❌ Matelas insuffisant';
  }

  let couvertureColor, couvertureLabel;
  if (tauxCouverture >= 3) { couvertureColor = '#27AE60'; couvertureLabel = '✅ Solide'; }
  else if (tauxCouverture >= 2) { couvertureColor = '#C8B400'; couvertureLabel = '⚠️ En bonne voie'; }
  else { couvertureColor = '#E74C3C'; couvertureLabel = '❌ Fragile (< 2 mois)'; }

  const totalBars = 40;
  const activeBars = Math.round((pct / 100) * totalBars);
  const barsHTML = Array.from({ length: totalBars }, (_, i) => {
    if (i < activeBars) {
      return `<div class="bar active" style="background:linear-gradient(180deg,${barColor2},${barColor1});box-shadow:0 0 5px ${barColor2}88;"></div>`;
    }
    return `<div class="bar inactive"></div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sécurité Financière - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1f1f1f;
      color: #eaeaea;
      padding: 12px 14px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .markers {
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding: 0 2px;
      margin-bottom: 5px;
    }
    .marker { font-size: 10px; color: #555; font-weight: 500; }
    .bars-wrap {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      width: 100%;
      height: 44px;
      padding: 0 2px;
      position: relative;
    }
    .bar { flex: 1; border-radius: 2px 2px 1px 1px; }
    .bar.active { height: 100%; }
    .bar.inactive { height: 80%; background: #2a2a2a; }
    .pct-line {
      position: absolute;
      left: calc(${pct}% - 1px);
      top: 0; bottom: 0;
      width: 1px;
      background: rgba(255,255,255,0.15);
    }
    .pct-dot {
      position: absolute;
      left: calc(${pct}% - 4px);
      top: -5px;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: white;
      opacity: 0.55;
    }
    .amount-section {
      margin-top: 14px;
      display: flex;
      align-items: baseline;
      gap: 12px;
      width: 100%;
      padding: 0 4px;
    }
    .amount-main {
      font-size: 25px;
      font-weight: 700;
      color: #eaeaea;
      letter-spacing: -1px;
      line-height: 1;
    }
    .amount-euro { font-size: 20px; font-weight: 400; color: #888; }
    .amount-right { display: flex; flex-direction: column; gap: 1px; }
    .amount-label { font-size: 15px; color: #666; line-height: 1.3; }
    .amount-cible { font-size: 15px; font-weight: 600; color: #555; }
    .status {
      margin-top: 6px;
      font-size: 15px;
      font-weight: 600;
      color: ${barColor2};
      width: 100%;
      padding: 0 4px;
    }
    .sep {
      width: 100%;
      height: 1px;
      background: #2a2a2a;
      margin: 10px 0;
    }
    .indicators {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
    }
    .indicator-card {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 10px 12px;
      border: 1px solid #2a2a2a;
    }
    .ind-label {
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .ind-value {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
    }
    .ind-sub {
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <div class="markers">
    <span class="marker">0</span>
    <span class="marker">25</span>
    <span class="marker">50</span>
    <span class="marker">75</span>
    <span class="marker">100</span>
  </div>

  <div class="bars-wrap">
    ${barsHTML}
    <div class="pct-line"></div>
    <div class="pct-dot"></div>
  </div>

  <div class="amount-section">
    <div class="amount-main">
      <span class="amount-euro">€ </span>${epargne.toLocaleString('fr-FR')}
    </div>
    <div class="amount-right">
      <div class="amount-label">constitué.s sur</div>
      <div class="amount-cible">${cible.toLocaleString('fr-FR')} € visé.s</div>
    </div>
  </div>

  <div class="status">${pct}% · ${statusLabel}</div>

  <div class="sep"></div>

  <div class="indicators">

    <div class="indicator-card" style="border-color:${couvertureColor}33">
      <div class="ind-label">Taux de couverture</div>
      <div class="ind-value" style="color:${couvertureColor}">${tauxCouverture} mois de revenus</div>
      <div class="ind-sub" style="color:#555">${couvertureLabel}</div>
    </div>

    <div class="indicator-card" style="border-color:${dispoInvest > 0 ? '#27AE6033' : '#E74C3C33'}">
      <div class="ind-label">Dispo. pour projet</div>
      <div class="ind-value" style="color:${dispoInvest > 0 ? '#27AE60' : '#555'}">${dispoInvest > 0 ? '+' : ''}${dispoInvest.toLocaleString('fr-FR')} €</div>
      <div class="ind-sub" style="color:${dispoInvest > 0 ? '#27AE60' : '#E74C3C'}">${dispoInvest > 0 ? '' : 'Complète ton matelas d\'abord'}</div>
    </div>

  </div>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
