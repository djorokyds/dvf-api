module.exports = async function handler(req, res) {
  const { pct_dette } = req.query;

  if (!pct_dette) {
    return res.status(400).json({ error: "Paramètre manquant (pct_dette)" });
  }

  const pct = Math.min(100, Math.max(0, parseFloat(pct_dette.replace(',', '.'))));

  let color1, color2;
  if (pct <= 30) { color1 = '#27AE60'; color2 = '#1a7a43'; }
  else if (pct <= 50) { color1 = '#F39C12'; color2 = '#b87200'; }
  else { color1 = '#E05555'; color2 = '#b83030'; }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dette - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
    }
    .container {
      width: 88%;
      position: relative;
    }

    /* Barre de fond */
    .bar-bg {
      width: 100%;
      height: 44px;
      background: #f0f0f0;
      border-radius: 22px;
      border: 2px solid #e0e0e0;
      position: relative;
      overflow: visible;
    }

    /* Barre remplie */
    .bar-fill {
      position: absolute;
      left: 0; top: 0;
      width: ${pct}%;
      height: 100%;
      border-radius: 22px;
      background: repeating-linear-gradient(
        -45deg,
        ${color1},
        ${color1} 10px,
        ${color2} 10px,
        ${color2} 20px
      );
      background-size: 28px 28px;
      animation: slide 1s linear infinite;
    }

    @keyframes slide {
      from { background-position: 0 0; }
      to { background-position: 28px 0; }
    }

    /* Ligne pointillée verticale */
    .dashed-line {
      position: absolute;
      top: 0;
      left: ${pct}%;
      transform: translateX(-50%);
      width: 1px;
      height: 44px;
      background: repeating-linear-gradient(
        to bottom,
        #1f2d5a,
        #1f2d5a 4px,
        transparent 4px,
        transparent 8px
      );
      z-index: 2;
    }

    /* Extension ligne vers le bas */
    .dashed-ext {
      position: absolute;
      top: 44px;
      left: ${pct}%;
      transform: translateX(-50%);
      width: 1px;
      height: 28px;
      background: repeating-linear-gradient(
        to bottom,
        #1f2d5a,
        #1f2d5a 3px,
        transparent 3px,
        transparent 6px
      );
      z-index: 2;
    }

    /* Label % */
    .pct-label {
      position: absolute;
      top: 80px;
      left: ${pct}%;
      transform: translateX(-50%);
      font-size: 22px;
      font-weight: 800;
      color: #1f2d5a;
      white-space: nowrap;
      letter-spacing: -0.5px;
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="bar-bg">
      <div class="bar-fill"></div>
      <div class="dashed-line"></div>
    </div>

    <div class="dashed-ext"></div>
    <div class="pct-label">${pct}%</div>

  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
