module.exports = async function handler(req, res) {
  const { montant_dispo, cible } = req.query;

  if (!montant_dispo || !cible) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const dispo = parseFloat(montant_dispo.replace(/\s/g, '').replace(',', '.'));
  const objectif = parseFloat(cible.replace(/\s/g, '').replace(',', '.'));

  const atteint = dispo >= objectif;
  const statut = atteint ? "Atteint" : "En cours";

  const ratio = objectif > 0 ? dispo / objectif : 0;
  const pct = Math.min(ratio, 1);

  const angle = -75 + (pct * 150);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Matelas de sécurité - Fi-One</title>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%;
      height: auto;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1f1f1f;
      color: #eaeaea;
    }

    .security-widget {
      width: 100%;
      height: 155px;
      background: #1f1f1f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 22px;
      overflow: hidden;
    }

    .left {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .status {
      font-size: 22px;
      color: #bdbdbd;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .amount-line {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .amount {
      font-size: 68px;
      line-height: 1;
      font-weight: 300;
      letter-spacing: -3px;
      color: #b7ff7a;
    }

    .target {
      font-size: 32px;
      font-weight: 300;
      color: #ffffff;
    }

    .gauge {
      position: relative;
      width: 190px;
      height: 105px;
      flex-shrink: 0;
    }

    .segment {
      position: absolute;
      width: 58px;
      height: 24px;
      border-radius: 20px;
      top: 46px;
      background: #333;
    }

    .seg-left {
      left: 4px;
      transform: rotate(-48deg);
      background: #333;
      border: 2px solid #3f3f3f;
    }

    .seg-mid {
      left: 60px;
      top: 22px;
      width: 86px;
      background: #b7ff7a;
      transform: rotate(0deg);
    }

    .seg-right {
      right: 5px;
      transform: rotate(48deg);
      background: #5f7b49;
    }

    .needle {
      position: absolute;
      left: 50%;
      bottom: 18px;
      width: 8px;
      height: 88px;
      background: #000;
      border-radius: 6px;
      transform-origin: bottom center;
      transform: translateX(-50%) rotate(${angle}deg);
      z-index: 5;
    }

    .needle::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 4px;
      width: 4px;
      height: 76px;
      background: #b7ff7a;
      transform: translateX(-50%);
      border-radius: 4px;
    }

    .pivot {
      position: absolute;
      left: 50%;
      bottom: 5px;
      width: 32px;
      height: 32px;
      background: #111;
      border: 7px solid #fff;
      border-radius: 50%;
      transform: translateX(-50%);
      z-index: 6;
    }
  </style>
</head>

<body>
  <div class="security-widget">
    <div class="left">
      <div class="status">${statut}</div>

      <div class="amount-line">
        <div class="amount">${dispo.toLocaleString('fr-FR')}</div>
        <div class="target">/${objectif.toLocaleString('fr-FR')}</div>
      </div>
    </div>

    <div class="gauge">
      <div class="segment seg-left"></div>
      <div class="segment seg-mid"></div>
      <div class="segment seg-right"></div>
      <div class="needle"></div>
      <div class="pivot"></div>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
