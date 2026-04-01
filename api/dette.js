module.exports = async function handler(req, res) {
  const { total_dettes, total_revenus } = req.query;

  if (!total_dettes || !total_revenus) {
    return res.status(400).json({ error: "Paramètres manquants (total_dettes, total_revenus)" });
  }

  const dettes = parseFloat(total_dettes.replace(/\s/g, '').replace(',', '.'));
  const revenus = parseFloat(total_revenus.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(100, Math.round((dettes / revenus) * 100));

  const colorPct = pct;
  const clearPct = 100 - pct;

  let color, statusLabel;
  if (pct <= 30) { color = '#27AE60'; statusLabel = '✓ Sain'; }
  else if (pct <= 50) { color = '#F39C12'; statusLabel = '⚠ Attention'; }
  else { color = '#E74C3C'; statusLabel = '✗ Élevé'; }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Taux d'endettement - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 300px;
      max-height: 300px;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      height: 300px;
    }

    .top {
      flex: ${clearPct};
      background: #F0EFE7;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      padding: 0 20px 10px;
      position: relative;
      min-height: 0;
    }
    .top-label {
      font-size: 11px;
      font-weight: 600;
      color: #999;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .top-info {
      position: absolute;
      bottom: 10px;
      right: 20px;
      text-align: right;
    }
    .top-info .amount {
      font-size: 13px;
      font-weight: 700;
      color: #aaa;
    }
    .top-info .label {
      font-size: 9px;
      color: #bbb;
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bottom {
      flex: ${colorPct};
      background: ${color};
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 20px;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
    .pct-number {
      font-size: clamp(48px, 14vw, 88px);
      font-weight: 900;
      color: #1a1a1a;
      line-height: 1;
      letter-spacing: -3px;
    }
    .pct-sign {
      font-size: clamp(24px, 7vw, 44px);
      font-weight: 900;
      color: #1a1a1a;
      vertical-align: super;
      letter-spacing: -1px;
    }
    .bottom-info {
      position: absolute;
      bottom: 12px;
      right: 20px;
      text-align: right;
    }
    .bottom-info .amount {
      font-size: 13px;
      font-weight: 700;
      color: rgba(0,0,0,0.45);
    }
    .bottom-info .label {
      font-size: 9px;
      color: rgba(0,0,0,0.35);
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status {
      position: absolute;
      top: 10px;
      right: 20px;
      font-size: 10px;
      font-weight: 700;
      color: rgba(0,0,0,0.45);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>

  <div class="top">
    <div class="top-label">Taux d'endettement</div>
    <div class="top-info">
      <div class="amount">${revenus.toLocaleString('fr-FR')} €</div>
      <div class="label">Revenus</div>
    </div>
  </div>

  <div class="bottom">
    <div class="pct-number">${pct}<span class="pct-sign">%</span></div>
    <div class="status">${statusLabel}</div>
    <div class="bottom-info">
      <div class="amount">${dettes.toLocaleString('fr-FR')} €</div>
      <div class="label">Dettes</div>
    </div>
  </div>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
