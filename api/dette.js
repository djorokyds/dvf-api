module.exports = async function handler(req, res) {
  const { total_dettes, total_revenus } = req.query;

  if (!total_dettes || !total_revenus) {
    return res.status(400).json({ error: "Paramètres manquants (total_dettes, total_revenus)" });
  }

  const dettes = parseFloat(total_dettes.replace(/\s/g, '').replace(',', '.'));
  const revenus = parseFloat(total_revenus.replace(/\s/g, '').replace(',', '.'));
  const pct = Math.min(100, Math.round((dettes / revenus) * 100));

  // La partie colorée prend pct% de la hauteur depuis le bas
  // La partie claire prend (100-pct)% depuis le haut
  const colorPct = pct;
  const clearPct = 100 - pct;

  // Couleur selon niveau de dette
  let color;
  if (pct <= 30) color = '#27AE60';      // vert — sain
  else if (pct <= 50) color = '#F39C12'; // orange — attention
  else color = '#E74C3C';                // rouge — dangereux

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
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Partie claire (haut) */
    .top {
      flex: ${clearPct};
      background: #F0EFE7;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      padding: 0 28px 16px;
      position: relative;
    }

    .top-label {
      font-size: 13px;
      font-weight: 600;
      color: #999;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* Partie colorée (bas) */
    .bottom {
      flex: ${colorPct};
      background: ${color};
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 24px;
      position: relative;
      overflow: hidden;
    }

    /* Grand chiffre */
    .pct-number {
      font-size: clamp(80px, 22vw, 140px);
      font-weight: 900;
      color: #1a1a1a;
      line-height: 1;
      letter-spacing: -4px;
    }
    .pct-sign {
      font-size: clamp(40px, 10vw, 70px);
      font-weight: 900;
      color: #1a1a1a;
      vertical-align: super;
      letter-spacing: -2px;
    }

    /* Info bas droite */
    .bottom-info {
      position: absolute;
      bottom: 20px;
      right: 24px;
      text-align: right;
    }
    .bottom-info .amount {
      font-size: 14px;
      font-weight: 700;
      color: rgba(0,0,0,0.5);
    }
    .bottom-info .label {
      font-size: 10px;
      color: rgba(0,0,0,0.35);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Info haut droite */
    .top-info {
      position: absolute;
      bottom: 16px;
      right: 24px;
      text-align: right;
    }
    .top-info .amount {
      font-size: 14px;
      font-weight: 700;
      color: #aaa;
    }
    .top-info .label {
      font-size: 10px;
      color: #bbb;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Status */
    .status {
      position: absolute;
      top: 20px;
      right: 24px;
      font-size: 11px;
      font-weight: 700;
      color: rgba(0,0,0,0.45);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>

  <!-- Partie claire -->
  <div class="top">
    <div class="top-label">Taux d'endettement</div>
    <div class="top-info">
      <div class="amount">${revenus.toLocaleString('fr-FR')} €</div>
      <div class="label">Revenus</div>
    </div>
  </div>

  <!-- Partie colorée -->
  <div class="bottom">
    <div class="pct-number">${pct}<span class="pct-sign">%</span></div>
    <div class="status">${pct <= 30 ? '✓ Sain' : pct <= 50 ? '⚠ Attention' : '✗ Élevé'}</div>
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
```

Commit comme `api/dette.js` et teste avec différents niveaux :
```
# Sain (vert)
https://dvf-api-flame.vercel.app/api/dette?total_dettes=600&total_revenus=3000

# Attention (orange)
https://dvf-api-flame.vercel.app/api/dette?total_dettes=1200&total_revenus=3000

# Élevé (rouge)
https://dvf-api-flame.vercel.app/api/dette?total_dettes=2100&total_revenus=3000
