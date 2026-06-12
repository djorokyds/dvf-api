module.exports = async function handler(req, res) {
  const { epargne_bloquee, epargne_dispo, epargne_brut, dette_court_terme } = req.query;

  if (!epargne_bloquee || !epargne_dispo || !epargne_brut || !dette_court_terme) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const bloquee = parseFloat(epargne_bloquee.replace(/\s/g, '').replace(',', '.'));
  const dispo = parseFloat(epargne_dispo.replace(/\s/g, '').replace(',', '.'));
  const brut = parseFloat(epargne_brut.replace(/\s/g, '').replace(',', '.'));
  const dette = parseFloat(dette_court_terme.replace(/\s/g, '').replace(',', '.'));

  const total = brut + dette;
  const pctEpargne = Math.round((brut / total) * 100);
  const pctDette = 100 - pctEpargne;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Épargne - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a1a;
      color: #eaeaea;
      padding: 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 10px;
      justify-content: center;
    }

    /* Cards */
    .card {
      background: #242424;
      border-radius: 16px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid #2e2e2e;
    }
    .card-icon {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .card-icon.orange { background: rgba(195,143,90,0.15); }
    .card-icon.green  { background: rgba(39,174,96,0.15); }
    .card-info { flex: 1; }
    .card-label {
      font-size: 13px;
      color: #888;
      margin-bottom: 3px;
    }
    .card-value {
      font-size: 20px;
      font-weight: 700;
    }
    .card-value.orange { color: #C38F5A; }
    .card-value.green  { color: #27AE60; }

    /* Barre */
    .bar-card {
      background: #242424;
      border-radius: 16px;
      padding: 16px 18px;
      border: 1px solid #2e2e2e;
    }
    .bar-wrap {
      position: relative;
      height: 14px;
      background: #2e2e2e;
      border-radius: 7px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .bar-epargne {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: ${pctEpargne}%;
      background: linear-gradient(90deg, #27AE60, #2ecc71);
      border-radius: 7px 0 0 7px;
      transition: width 1s ease;
    }
    .bar-dette {
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: ${pctDette}%;
      background: linear-gradient(90deg, #c0392b, #E74C3C);
      border-radius: 0 7px 7px 0;
    }
    .bar-legend {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .legend-dot.green { background: #27AE60; }
    .legend-dot.red   { background: #E74C3C; }
    .legend-item.green { color: #27AE60; }
    .legend-item.red   { color: #E74C3C; }
    .legend-sep {
      width: 1px;
      height: 16px;
      background: #333;
    }
  </style>
</head>
<body>

  <!-- Épargne bloquée -->
  <div class="card">
    <div class="card-icon orange">🔒</div>
    <div class="card-info">
      <div class="card-label">Épargne bloquée</div>
      <div class="card-value orange">${bloquee.toLocaleString('fr-FR')} €</div>
    </div>
  </div>

  <!-- Épargne nette disponible -->
  <div class="card">
    <div class="card-icon green">✅</div>
    <div class="card-info">
      <div class="card-label">Épargne nette disponible</div>
      <div class="card-value green">${dispo.toLocaleString('fr-FR')} €</div>
    </div>
  </div>

  <!-- Barre épargne brut vs dette -->
  <div class="bar-card">
    <div class="bar-wrap">
      <div class="bar-epargne"></div>
      <div class="bar-dette"></div>
    </div>
    <div class="bar-legend">
      <div class="legend-item green">
        <div class="legend-dot green"></div>
        Épargne brut (${brut.toLocaleString('fr-FR')} €)
      </div>
      <div class="legend-sep"></div>
      <div class="legend-item red">
        <div class="legend-dot red"></div>
        Dette (${dette.toLocaleString('fr-FR')} €)
      </div>
    </div>
  </div>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
