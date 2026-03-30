module.exports = async function handler(req, res) {
  const { mensualite_credit, total_mensuel } = req.query;

  if (!mensualite_credit || !total_mensuel) {
    return res.status(400).json({ error: "Paramètres manquants (mensualite_credit, total_mensuel)" });
  }

  const credit = parseFloat(mensualite_credit.replace(/\s/g, '').replace(',', '.'));
  const total = parseFloat(total_mensuel.replace(/\s/g, '').replace(',', '.'));
  const charges = Math.round(total - credit);
  const pctCredit = Math.round((credit / total) * 100);
  const pctTotal = 100;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mensualités - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a1a;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .container {
      width: 100%;
      max-width: 420px;
      padding: 32px 24px;
      position: relative;
    }

    /* Graphe */
    .chart-area {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 40px;
      height: 260px;
      position: relative;
      margin-bottom: 24px;
    }

    /* Colonne */
    .bar-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      width: 110px;
    }

    /* Label au dessus */
    .bar-label-top {
      position: absolute;
      top: -70px;
      text-align: left;
      width: 160px;
    }
    .bar-label-top.right {
      left: 0;
    }
    .bar-label-top.left {
      left: 0;
    }
    .bar-amount {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 4px;
    }
    .bar-amount.green { color: #C38F5A; }
    .bar-amount.white { color: #eaeaea; }
    .bar-desc {
      font-size: 11px;
      line-height: 1.4;
    }
    .bar-desc.green { color: #C38F5A; }
    .bar-desc.white { color: #888; }

    /* Dot + ligne pointillée */
    .dot-line {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-bottom: 0;
    }
    .dot.green { background: #C38F5A; }
    .dot.white { background: #888; }
    .dashed-line {
      width: 1px;
      background: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 4px,
        currentColor 4px,
        currentColor 8px
      );
    }
    .dashed-line.green { color: #C38F5A; }
    .dashed-line.white { color: #555; }

    /* Barre 3D */
    .bar-3d {
      position: relative;
      width: 100%;
      border-radius: 4px 4px 0 0;
      overflow: visible;
    }

    /* Face avant */
    .bar-front {
      width: 100%;
      border-radius: 4px 4px 0 0;
      position: relative;
    }
    .bar-front.green {
      background: linear-gradient(180deg, #1a3d2a 0%, #0d1f14 100%);
      border-top: 2px solid #C38F5A;
      box-shadow: 0 0 20px rgba(195,143,90,0.3), inset 0 0 30px rgba(195,143,90,0.05);
    }
    .bar-front.white {
      background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
      border-top: 2px solid #aaa;
    }

    /* Effet top glow */
    .bar-front.green::after {
      content: '';
      position: absolute;
      top: -2px;
      left: 0; right: 0;
      height: 4px;
      background: #C38F5A;
      border-radius: 4px 4px 0 0;
      filter: blur(3px);
      opacity: 0.8;
    }

    /* Face droite 3D */
    .bar-side {
      position: absolute;
      right: -12px;
      top: 0;
      width: 12px;
      border-radius: 0 4px 0 0;
    }
    .bar-side.green {
      background: linear-gradient(180deg, #0f2d1a 0%, #081008 100%);
      border-top: 2px solid #8B6535;
    }
    .bar-side.white {
      background: linear-gradient(180deg, #222 0%, #111 100%);
      border-top: 2px solid #777;
    }

    /* Ligne de base */
    .baseline {
      position: absolute;
      bottom: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: rgba(255,255,255,0.08);
    }

    /* Cards résumé */
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .summary-card {
      background: #222;
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid #2a2a2a;
    }
    .summary-card.accent { border-color: #C38F5A; }
    .s-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .s-value { font-size: 18px; font-weight: 700; color: #eaeaea; }
    .s-value.accent { color: #C38F5A; }
    .s-sub { font-size: 10px; color: #444; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="container">

    <div class="chart-area">

      <!-- Colonne gauche — Mensualité crédit -->
      <div class="bar-wrap">

        <div class="bar-label-top left">
          <div class="bar-amount white">${credit.toLocaleString('fr-FR')} €</div>
          <div class="bar-desc white">mensualité<br>du crédit</div>
        </div>

        <!-- Dot + ligne pointillée -->
        <div class="dot-line" style="top:${Math.round((1 - pctCredit/100) * 260) - 80}px; height:${Math.round(pctCredit/100 * 260) + 80}px; position:absolute; left:50%">
          <div class="dot white"></div>
          <div class="dashed-line white" style="height:${Math.round(pctCredit/100 * 260) + 40}px"></div>
        </div>

        <!-- Barre -->
        <div class="bar-3d" style="height:${Math.round(pctCredit/100 * 220)}px">
          <div class="bar-front white" style="height:100%"></div>
          <div class="bar-side white" style="height:calc(100% - 2px); top:2px;
            clip-path: polygon(0 0, 100% 6px, 100% 100%, 0 100%)"></div>
        </div>

      </div>

      <!-- Colonne droite — Total mensuel -->
      <div class="bar-wrap">

        <div class="bar-label-top right">
          <div class="bar-amount green">${total.toLocaleString('fr-FR')} €</div>
          <div class="bar-desc green">coût mensuel<br>total réel</div>
        </div>

        <!-- Dot + ligne pointillée -->
        <div class="dot-line" style="top:-80px; height:${220 + 80}px; position:absolute; left:50%">
          <div class="dot green"></div>
          <div class="dashed-line green" style="height:${220 + 40}px"></div>
        </div>

        <!-- Barre -->
        <div class="bar-3d" style="height:220px">
          <div class="bar-front green" style="height:100%"></div>
          <div class="bar-side green" style="height:calc(100% - 2px); top:2px;
            clip-path: polygon(0 0, 100% 6px, 100% 100%, 0 100%)"></div>
        </div>

      </div>

      <div class="baseline"></div>
    </div>

    <!-- Résumé -->
    <div class="summary">
      <div class="summary-card">
        <div class="s-label">Crédit seul</div>
        <div class="s-value">${credit.toLocaleString('fr-FR')} €</div>
        <div class="s-sub">${pctCredit}% du coût total</div>
      </div>
      <div class="summary-card accent">
        <div class="s-label">Charges & impôts</div>
        <div class="s-value accent">${charges.toLocaleString('fr-FR')} €</div>
        <div class="s-sub">${100 - pctCredit}% du coût total</div>
      </div>
      <div class="summary-card" style="grid-column:1/-1">
        <div class="s-label">Coût mensuel total réel</div>
        <div class="s-value accent">${total.toLocaleString('fr-FR')} €</div>
        <div class="s-sub">Crédit + charges + impôts fonciers</div>
      </div>
    </div>

  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
