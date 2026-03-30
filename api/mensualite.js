module.exports = async function handler(req, res) {
  const { mensualite_credit, impot, charges, total } = req.query;

  if (!mensualite_credit || !impot || !charges || !total) {
    return res.status(400).json({ error: "Paramètres manquants (mensualite_credit, impot, charges, total)" });
  }

  const credit = parseFloat(mensualite_credit.replace(/\s/g, '').replace(',', '.'));
  const impotVal = parseFloat(impot.replace(/\s/g, '').replace(',', '.'));
  const chargesVal = parseFloat(charges.replace(/\s/g, '').replace(',', '.'));
  const totalVal = parseFloat(total.replace(/\s/g, '').replace(',', '.'));

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
      background: #0d1117;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>

  <script>
    const credit = ${credit};
    const impotVal = ${impotVal};
    const chargesVal = ${chargesVal};
    const totalVal = ${totalVal};

    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    const W = Math.min(window.innerWidth, 420);
    const H = 520;
    canvas.width = W;
    canvas.height = H;

    // Couleurs
    const C = {
      total:   ['#C38F5A', '#8B5E2A'],
      credit:  ['#C38F5A', '#7A4A10'],
      impot:   ['#3dbf8a', '#1a6b4a'],
      charges: ['#5b9bd5', '#2a5a8a'],
    };

    const barW = W * 0.22;
    const topY = 40;
    const bottomY = H - 40;
    const totalH = bottomY - topY - 80;

    // Barre du haut (total) — centrée
    const topBarX = W / 2 - barW / 2;
    const topBarY = topY;
    const topBarH = 50;

    // Gap entre barres haut et bas
    const flowGap = 80;
    const bottomBarY = topBarY + topBarH + flowGap;
    const bottomH = bottomY - bottomBarY;

    // Largeurs proportionnelles des barres basses
    const gap = 16;
    const usableW = W - 48;
    const creditW  = (credit / totalVal) * usableW;
    const impotW   = (impotVal / totalVal) * usableW;
    const chargesW = (chargesVal / totalVal) * usableW;

    // Positions X barres basses
    const startX = 24;
    const creditX  = startX;
    const impotX   = creditX + creditW + gap;
    const chargesX = impotX + impotW + gap;

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return 'rgba('+r+','+g+','+b+','+alpha+')';
    }

    // Dégradé vertical pour une barre
    function drawBar(x, y, w, h, colors, radius = 6) {
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();

      // Lueur sur le bord haut
      const glowGrad = ctx.createLinearGradient(0, y, 0, y + 8);
      glowGrad.addColorStop(0, hexToRgba(colors[0], 0.8));
      glowGrad.addColorStop(1, hexToRgba(colors[0], 0));
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 8, [radius, radius, 0, 0]);
      ctx.fill();
    }

    // Flux Bezier vertical du haut vers le bas
    function drawFlow(x1, w1, x2, w2, y1, y2, colors) {
      // Dégradé vertical
      const grad = ctx.createLinearGradient(0, y1, 0, y2);
      grad.addColorStop(0, hexToRgba(colors[0], 0.7));
      grad.addColorStop(0.5, hexToRgba(colors[0], 0.4));
      grad.addColorStop(1, hexToRgba(colors[1], 0.7));

      const midY = (y1 + y2) / 2;

      ctx.beginPath();
      // Bord gauche
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
      // Bord bas
      ctx.lineTo(x2 + w2, y2);
      // Bord droit
      ctx.bezierCurveTo(x2 + w2, midY, x1 + w1, midY, x1 + w1, y1);
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();
    }

    // === DESSIN ===

    // Barre du haut (total)
    drawBar(topBarX, topBarY, barW, topBarH, C.total);

    // Calcul des positions de départ sur la barre du haut (proportionnel)
    const creditX1  = topBarX + (credit / totalVal) * 0 * barW; // commence à gauche
    const creditW1  = (credit / totalVal) * barW;
    const impotX1   = creditX1 + creditW1;
    const impotW1   = (impotVal / totalVal) * barW;
    const chargesX1 = impotX1 + impotW1;
    const chargesW1 = (chargesVal / totalVal) * barW;

    // Flux crédit
    drawFlow(
      topBarX + creditX1 - topBarX, creditW1,
      creditX, creditW,
      topBarY + topBarH, bottomBarY,
      C.credit
    );

    // Flux impôt
    drawFlow(
      topBarX + impotX1 - topBarX, impotW1,
      impotX, impotW,
      topBarY + topBarH, bottomBarY,
      C.impot
    );

    // Flux charges
    drawFlow(
      topBarX + chargesX1 - topBarX, chargesW1,
      chargesX, chargesW,
      topBarY + topBarH, bottomBarY,
      C.charges
    );

    // Barres du bas
    drawBar(creditX,  bottomBarY, creditW,  bottomH, C.credit);
    drawBar(impotX,   bottomBarY, impotW,   bottomH, C.impot);
    drawBar(chargesX, bottomBarY, chargesW, bottomH, C.charges);

    // === LABELS ===
    ctx.textAlign = 'center';

    // Label haut
    ctx.fillStyle = '#C38F5A';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText(totalVal.toLocaleString('fr-FR') + ' €', W / 2, topBarY - 10);
    ctx.fillStyle = '#666';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('TOTAL MENSUEL', W / 2, topBarY - 24);

    // Labels bas
    const labels = [
      { x: creditX + creditW / 2,   val: credit,     label: 'Crédit',  color: C.credit[0] },
      { x: impotX + impotW / 2,     val: impotVal,   label: 'Impôts',  color: C.impot[0] },
      { x: chargesX + chargesW / 2, val: chargesVal, label: 'Charges', color: C.charges[0] },
    ];

    labels.forEach(l => {
      // Montant
      ctx.fillStyle = l.color;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillText(l.val.toLocaleString('fr-FR') + ' €', l.x, bottomBarY - 10);
      // Libellé
      ctx.fillStyle = '#555';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(l.label, l.x, bottomBarY - 22);
      // Pourcentage en bas
      ctx.fillStyle = hexToRgba(l.color, 0.6);
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(Math.round(l.val / totalVal * 100) + '%', l.x, bottomBarY + bottomH + 16);
    });

  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
