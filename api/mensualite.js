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
      padding: 24px 16px;
    }
    .container { width: 100%; max-width: 420px; }
    .title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 24px;
      text-align: center;
    }
    .sankey-wrap {
      position: relative;
      width: 100%;
      height: 320px;
    }
    canvas { width: 100% !important; }

    .s-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .s-value { font-size: 15px; font-weight: 700; }
    .s-pct { font-size: 9px; color: #444; margin-top: 2px; }
    
    .total-label { font-size: 11px; color: #888; }
    .total-value { font-size: 24px; font-weight: 800; color: #C38F5A; }
  </style>
</head>
<body>
  <div class="container">

    <div class="title">Décomposition mensuelle · Fi-One</div>

    <div class="sankey-wrap">
      <canvas id="sankeyChart"></canvas>
    </div>

  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <script>
    const totalVal = ${totalVal};
    const credit = ${credit};
    const impotVal = ${impotVal};
    const chargesVal = ${chargesVal};

    const canvas = document.getElementById('sankeyChart');
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 380;
    const H = 320;
    canvas.width = W;
    canvas.height = H;

    // Couleurs
    const colors = {
      total:   '#C38F5A',
      credit:  '#C38F5A',
      impot:   '#3dbf8a',
      charges: '#5b9bd5',
    };

    // Positions
    const leftX = W * 0.15;
    const rightX = W * 0.85;
    const centerY = H / 2;

    // Hauteurs proportionnelles
    const totalH = H * 0.7;
    const creditH = (credit / totalVal) * totalH;
    const impotH = (impotVal / totalVal) * totalH;
    const chargesH = (chargesVal / totalVal) * totalH;

    const barW = 18;

    // Positions Y droite
    const gap = 12;
    const totalRightH = creditH + impotH + chargesH + gap * 2;
    const creditY = centerY - totalRightH / 2;
    const impotY = creditY + creditH + gap;
    const chargesY = impotY + impotH + gap;

    // Dessiner un flux de Bezier rempli
    function drawFlow(y1Start, y1End, y2Start, y2End, color, alpha = 0.7) {
      const grad = ctx.createLinearGradient(leftX, 0, rightX, 0);
      grad.addColorStop(0, hexToRgba(color, alpha * 0.6));
      grad.addColorStop(1, hexToRgba(color, alpha));

      ctx.beginPath();
      ctx.moveTo(leftX + barW, y1Start);
      ctx.bezierCurveTo(
        leftX + (rightX - leftX) * 0.5, y1Start,
        leftX + (rightX - leftX) * 0.5, y2Start,
        rightX - barW, y2Start
      );
      ctx.lineTo(rightX - barW, y2End);
      ctx.bezierCurveTo(
        leftX + (rightX - leftX) * 0.5, y2End,
        leftX + (rightX - leftX) * 0.5, y1End,
        leftX + barW, y1End
      );
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function drawBar(x, yStart, h, color, side = 'left') {
      const grad = ctx.createLinearGradient(0, yStart, 0, yStart + h);
      grad.addColorStop(0, hexToRgba(color, 0.9));
      grad.addColorStop(1, hexToRgba(color, 0.5));
      ctx.fillStyle = grad;
      if (side === 'left') {
        ctx.fillRect(x - barW / 2, yStart, barW, h);
      } else {
        ctx.fillRect(x - barW / 2, yStart, barW, h);
      }
    }

    // === DESSIN ===

    // Barre gauche (total)
    const totalYStart = centerY - totalH / 2;
    drawBar(leftX, totalYStart, totalH, colors.total);

    // Flux crédit
    drawFlow(
      totalYStart, totalYStart + creditH,
      creditY, creditY + creditH,
      colors.credit, 0.65
    );

    // Flux impôt
    drawFlow(
      totalYStart + creditH, totalYStart + creditH + impotH,
      impotY, impotY + impotH,
      colors.impot, 0.65
    );

    // Flux charges
    drawFlow(
      totalYStart + creditH + impotH, totalYStart + creditH + impotH + chargesH,
      chargesY, chargesY + chargesH,
      colors.charges, 0.65
    );

    // Barres droites
    drawBar(rightX, creditY, creditH, colors.credit);
    drawBar(rightX, impotY, impotH, colors.impot);
    drawBar(rightX, chargesY, chargesH, colors.charges);

    // Labels gauche
    ctx.fillStyle = colors.total;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(totalVal.toLocaleString('fr-FR') + ' €', leftX - barW / 2 - 6, centerY + 5);
    ctx.fillStyle = '#666';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('Total', leftX - barW / 2 - 6, centerY + 18);

    // Labels droite
    const labelsRight = [
      { y: creditY + creditH / 2, label: 'Crédit', val: credit, color: colors.credit },
      { y: impotY + impotH / 2, label: 'Impôts', val: impotVal, color: colors.impot },
      { y: chargesY + chargesH / 2, label: 'Charges', val: chargesVal, color: colors.charges },
    ];

    labelsRight.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(l.val.toLocaleString('fr-FR') + ' €', rightX + barW / 2 + 8, l.y + 2);
      ctx.fillStyle = '#555';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(l.label, rightX + barW / 2 + 8, l.y + 14);
    });

  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
