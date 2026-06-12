module.exports = async function handler(req, res) {
  const { montant_dispo, cible } = req.query;

  if (!montant_dispo || !cible) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const dispo = parseFloat(montant_dispo.replace(/\s/g, '').replace(',', '.'));
  const objectif = parseFloat(cible.replace(/\s/g, '').replace(',', '.'));

  const ratio = objectif > 0 ? dispo / objectif : 0;
  const score = Math.min(Math.round(ratio * 100), 100);
  const manque = Math.max(objectif - dispo, 0);

  const angle = -90 + (score / 100) * 180;

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
      padding: 18px;
    }

    .security-card {
      background: #242424;
      border-radius: 18px;
      padding: 20px;
      border: 1px solid #2f2f2f;
    }

    .title {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .score-block {
      flex: 1;
    }

    .label {
      font-size: 14px;
      color: #888;
      margin-bottom: 6px;
    }

    .score {
      font-size: 58px;
      font-weight: 900;
      line-height: 1;
      color: #9CFF7A;
      letter-spacing: -2px;
    }

    .score span {
      font-size: 24px;
      color: #eaeaea;
      font-weight: 600;
      letter-spacing: 0;
    }

    .amount {
      margin-top: 14px;
      font-size: 15px;
      color: #aaa;
      line-height: 1.4;
    }

    .amount strong {
      color: #fff;
    }

    .gauge {
      position: relative;
      width: 150px;
      height: 85px;
    }

    .arc {
      position: absolute;
      width: 150px;
      height: 75px;
      border-radius: 150px 150px 0 0;
      overflow: hidden;
      bottom: 0;
    }

    .arc::before {
      content: "";
      position: absolute;
      inset: 0;
      background: conic-gradient(
        from 270deg at 50% 100%,
        #3a3a3a 0deg,
        #3a3a3a 55deg,
        #9CFF7A 55deg,
        #9CFF7A 125deg,
        #4F6B3F 125deg,
        #4F6B3F 180deg,
        transparent 180deg
      );
    }

    .arc::after {
      content: "";
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 0;
      height: 57px;
      background: #242424;
      border-radius: 120px 120px 0 0;
    }

    .needle {
      position: absolute;
      left: 50%;
      bottom: 8px;
      width: 4px;
      height: 68px;
      background: #ffffff;
      border-radius: 4px;
      transform-origin: bottom center;
      transform: translateX(-50%) rotate(${angle}deg);
      z-index: 3;
    }

    .needle::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -9px;
      width: 22px;
      height: 22px;
      background: #242424;
      border: 5px solid #fff;
      border-radius: 50%;
      transform: translateX(-50%);
    }

    .status {
      margin-top: 18px;
      background: rgba(39, 174, 96, 0.12);
      border: 1px solid rgba(39, 174, 96, 0.25);
      color: #7DFFB0;
      border-radius: 14px;
      padding: 13px 15px;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
    }

    .info {
      margin-top: 12px;
      color: #888;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>

<body>
  <div class="security-card">
    <div class="title">🛡️ Matelas de sécurité</div>

    <div class="content">
      <div class="score-block">
        <div class="label">Niveau de couverture</div>
        <div class="score">${score}<span> /100</span></div>

        <div class="amount">
          <strong>${dispo.toLocaleString('fr-FR')} €</strong> disponibles<br>
          Objectif : ${objectif.toLocaleString('fr-FR')} €
        </div>
      </div>

      <div class="gauge">
        <div class="arc"></div>
        <div class="needle"></div>
      </div>
    </div>

    <div class="status">
      ${
        score >= 100
          ? `✅ Objectif atteint : votre sécurité financière est assurée.`
          : `🟠 Il manque ${manque.toLocaleString('fr-FR')} € pour atteindre votre cible.`
      }
    </div>

    <p class="info">
      ℹ️ Le matelas de sécurité correspond à l’épargne disponible pour faire face aux imprévus.
    </p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
