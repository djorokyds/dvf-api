module.exports = async function handler(req, res) {
  const { impot_estime, reduction_impot } = req.query;

  if (!impot_estime || !reduction_impot) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const impot = parseFloat(impot_estime.replace(/\s/g, '').replace(',', '.'));
  const reduction = parseFloat(reduction_impot.replace(/\s/g, '').replace(',', '.'));
  const impotRestant = Math.max(0, impot - reduction);
  const pct = Math.min(100, Math.round((reduction / impot) * 100));

  // Centre ellipse fixe
  const cx = 150, cy = 155;
  const rx = 110;

  // Partie visible (au dessus) : fixe
  const ryTop = 80;

  // Partie immergée (en dessous) : grandit avec pct
  // pct=0 → ry=30, pct=100 → ry=140
  const ryBottom = Math.round(30 + (pct / 100) * 110);

  // Horizon = cy (fixe, centre de l'ellipse)
  const horizonY = cy;
  const horizonPct = (horizonY / 340) * 100;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyse PER - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1f1f1f;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container { width: 100%; max-width: 380px; padding: 32px 24px; text-align: center; }
    .title { font-size: 13px; font-weight: 600; letter-spacing: 2px; color: #888; text-transform: uppercase; margin-bottom: 28px; }
    .iceberg-wrap { position: relative; width: 300px; height: 340px; margin: 0 auto 24px; }
    .horizon {
      position: absolute;
      left: 0; right: 0;
      top: ${horizonPct.toFixed(1)}%;
      height: 1px;
      background: rgba(255,255,255,0.15);
      z-index: 3;
    }
    .label-top { position: absolute; top: 8px; left: -12px; text-align: left; z-index: 4; }
    .label-top .amount { font-size: 26px; font-weight: 800; color: #eaeaea; }
    .label-top .desc { font-size: 11px; color: #C38F5A; margin-top: 2px; font-weight: 500; }
    .label-top .avant { font-size: 10px; color: #555; margin-top: 4px; }
    .label-bottom { position: absolute; bottom: 8px; right: 12px; text-align: right; z-index: 4; }
    .label-bottom .amount { font-size: 26px; font-weight: 800; color: #eaeaea; }
    .label-bottom .desc { font-size: 11px; color: #C38F5A; margin-top: 2px; font-weight: 500; }
    .iceberg-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .badge { display: inline-block; background: #C38F5A; color: #1f1f1f; font-size: 13px; font-weight: 800; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
    .footer-text { font-size: 12px; color: #666; line-height: 1.6; max-width: 300px; margin: 0 auto; }
    .footer-text strong { color: #C38F5A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">Analyse PER · Fi-One</div>

    <div class="iceberg-wrap">
      <div class="label-top">
        <div class="amount">${impotRestant.toLocaleString('fr-FR')} €</div>
        <div class="desc">Impôt restant dû</div>
        <div class="avant">Avant PER : ${impot.toLocaleString('fr-FR')} €</div>
      </div>

      <div class="label-bottom">
        <div class="amount">${reduction.toLocaleString('fr-FR')} €</div>
        <div class="desc">Économie via PER</div>
      </div>

      <div class="horizon"></div>

      <svg class="iceberg-svg" viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gradTop" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stop-color="#C38F5A" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#8B5E2A" stop-opacity="0.7"/>
          </radialGradient>
          <radialGradient id="gradBottom" cx="50%" cy="20%" r="60%">
            <stop offset="0%" stop-color="#C38F5A" stop-opacity="0.55"/>
            <stop offset="55%" stop-color="#8B5E2A" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#1f1f1f" stop-opacity="0"/>
          </radialGradient>
          <clipPath id="clipTop">
            <rect x="0" y="0" width="300" height="${horizonY}"/>
          </clipPath>
          <clipPath id="clipBottom">
            <rect x="0" y="${horizonY}" width="300" height="${340 - horizonY}"/>
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="18" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Partie immergée — ryBottom grandit avec pct -->
        <ellipse
          cx="${cx}" cy="${cy}"
          rx="${rx}" ry="${ryBottom}"
          fill="url(#gradBottom)"
          clip-path="url(#clipBottom)"
          filter="url(#glow)"
        />

        <!-- Partie visible — ryTop fixe -->
        <ellipse
          cx="${cx}" cy="${cy}"
          rx="${rx}" ry="${ryTop}"
          fill="url(#gradTop)"
          clip-path="url(#clipTop)"
        />
      </svg>
    </div>

    <div class="badge">− ${pct}% d'impôt</div>

    <div class="footer-text">
      En versant sur votre PER, vous économisez
      <strong>${reduction.toLocaleString('fr-FR')} €</strong> sur votre impôt annuel.
      Il ne vous reste que <strong>${impotRestant.toLocaleString('fr-FR')} €</strong> à payer.
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
