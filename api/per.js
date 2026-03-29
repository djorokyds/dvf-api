module.exports = async function handler(req, res) {
  const { impot_estime, reduction_impot } = req.query;

  if (!impot_estime || !reduction_impot) {
    return res.status(400).json({ error: "Paramètres manquants (impot_estime, reduction_impot)" });
  }

  const impot = parseFloat(impot_estime.replace(/\s/g, '').replace(',', '.'));
  const reduction = parseFloat(reduction_impot.replace(/\s/g, '').replace(',', '.'));
  const impotRestant = Math.max(0, impot - reduction);
  const pct = Math.min(100, Math.max(0, Math.round((reduction / impot) * 100)));

  // pct=50 → ry=130 (état de référence)
  // pct=0  → ry=20
  // pct=100 → ry=200
  const ryBottom = Math.round(20 + (pct / 100) * 360 / 1.8);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyse PER </title>
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
    .container {
      width: 100%;
      max-width: 380px;
      padding: 32px 24px;
      text-align: center;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 28px;
    }
    .iceberg-wrap {
      position: relative;
      width: 300px;
      height: 320px;
      margin: 0 auto 24px;
    }
    .horizon {
      position: absolute;
      left: 0; right: 0;
      top: 42%;
      height: 1px;
      background: rgba(255,255,255,0.15);
      z-index: 3;
    }
    .label-top {
      position: absolute;
      top: 8px;
      left: -25px;
      text-align: left;
      z-index: 4;
    }
    .label-top .amount { font-size: 20px; font-weight: 700; color: #eaeaea; }
    .label-top .desc { font-size: 11px; color: #C38F5A; margin-top: 2px; font-weight: 500; }
    .label-top .avant { font-size: 10px; color: #555; margin-top: 4px; }
    .label-bottom {
      position: absolute;
      bottom: 8px;
      right: 12px;
      text-align: right;
      z-index: 4;
    }
    .label-bottom .amount { font-size: 20px; font-weight: 700; color: #eaeaea; }
    .label-bottom .desc { font-size: 11px; color: #C38F5A; margin-top: 2px; font-weight: 500; }
    .iceberg-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .badge { display: inline-block; background: #C38F5A; color: #1f1f1f; font-size: 13px; font-weight: 800; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
    .footer-text { font-size: 12px; color: #666; line-height: 1.6; max-width: 300px; margin: 0 auto; }
    .footer-text strong { color: #C38F5A; }
  </style>
</head>
<body>
  <div class="container">

    <div class="title">Analyse PER </div>

    <div class="iceberg-wrap">

      <div class="label-top">
        <div class="amount">${impotRestant.toLocaleString('fr-FR')} €</div>
        <div class="desc">Impôt restant dû</div>
        <div style="font-size:10px;color:#555;margin-top:4px;">
          Avant PER : ${impot.toLocaleString('fr-FR')} €
        </div>
      </div>

      <div class="label-bottom">
        <div class="amount">${reduction.toLocaleString('fr-FR')} €</div>
        <div class="desc">Économie via PER</div>
      </div>

      <div class="horizon"></div>

      <svg class="iceberg-svg" viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gradTop" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stop-color="#C38F5A" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#8B5E2A" stop-opacity="0.7"/>
          </radialGradient>
          <radialGradient id="gradBottom" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#C38F5A" stop-opacity="0.85"/>
            <stop offset="60%" stop-color="#8B5E2A" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#1f1f1f" stop-opacity="0"/>
          </radialGradient>
          <clipPath id="clipTop">
            <rect x="0" y="0" width="300" height="134"/>
          </clipPath>
          <clipPath id="clipBottom">
            <rect x="0" y="134" width="300" height="186"/>
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="28" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Partie immergée — SEUL ryBottom est dynamique -->
        <ellipse
          cx="150" cy="160"
          rx="115" ry="${ryBottom}"
          fill="url(#gradBottom)"
          clip-path="url(#clipBottom)"
          filter="url(#glow)"
        />

        <!-- Partie visible — INCHANGÉE -->
        <ellipse
          cx="150" cy="160"
          rx="115" ry="130"
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
