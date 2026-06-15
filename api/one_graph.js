module.exports = async function handler(req, res) {
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const params = {};
  months.forEach(m => {
    if (req.query[m]) {
      params[m] = parseFloat(req.query[m].replace(/\s/g, '').replace(',', '.'));
    }
  });

  if (Object.keys(params).length === 0) {
    return res.status(400).json({ error: "Paramètres manquants (jan, feb, mar, ...dec)" });
  }

  const currentMonth = new Date().getMonth(); // 0=jan, 11=dec
  const labels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const values = months.map(m => params[m] !== undefined ? params[m] : null);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Évolution Épargne - Fi-One</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e;
      color: #eaeaea;
      padding: 16px 12px 12px;
    }
    .chart-container {
      position: relative;
      width: 100%;
      height: 200px;
    }
  </style>
</head>
<body>
  <div class="chart-container">
    <canvas id="chart"></canvas>
  </div>

  <script>
    const currentMonth = ${currentMonth};
    const labels = ${JSON.stringify(labels)};
    const values = ${JSON.stringify(values)};

    // Séparer passé/futur
    const pastValues  = values.map((v, i) => i <= currentMonth ? v : null);
    const futureValues = values.map((v, i) => i >= currentMonth ? v : null);

    // Gradient passé (violet)
    function getPastGradient(ctx, chartArea) {
      const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      grad.addColorStop(0, 'rgba(160, 80, 220, 0.5)');
      grad.addColorStop(1, 'rgba(160, 80, 220, 0.0)');
      return grad;
    }

    // Gradient futur (gris)
    function getFutureGradient(ctx, chartArea) {
      const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      grad.addColorStop(0, 'rgba(100, 100, 130, 0.3)');
      grad.addColorStop(1, 'rgba(100, 100, 130, 0.0)');
      return grad;
    }

    let pastGrad, futureGrad;

    const chart = new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          // Passé — violet
          {
            label: 'Épargne',
            data: pastValues,
            borderColor: '#A050DC',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#A050DC',
            pointHoverBorderWidth: 2,
            tension: 0.4,
            fill: true,
            backgroundColor: function(context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return 'transparent';
              if (!pastGrad) pastGrad = getPastGradient(ctx, chartArea);
              return pastGrad;
            },
            spanGaps: true,
          },
          // Futur — gris
          {
            label: 'Projection',
            data: futureValues,
            borderColor: '#555577',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#555577',
            pointHoverBorderWidth: 2,
            tension: 0.4,
            fill: true,
            backgroundColor: function(context) {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return 'transparent';
              if (!futureGrad) futureGrad = getFutureGradient(ctx, chartArea);
              return futureGrad;
            },
            spanGaps: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2a4a',
            borderColor: '#A050DC',
            borderWidth: 1,
            titleColor: '#aaa',
            bodyColor: '#fff',
            titleFont: { size: 11 },
            bodyFont: { size: 14, weight: 'bold' },
            padding: 10,
            displayColors: false,
            callbacks: {
              title: ctx => ctx[0].label,
              label: ctx => {
                const val = ctx.parsed.y;
                if (val === null) return null;
                return '€ ' + val.toLocaleString('fr-FR');
              },
              // Ligne verticale custom via afterDraw
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#666',
              font: { size: 11 },
              maxRotation: 0,
            },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            display: false,
            grid: { display: false },
          }
        }
      },
      plugins: [
        // Plugin ligne verticale au hover
        {
          id: 'verticalLine',
          afterDraw(chart) {
            if (chart.tooltip._active && chart.tooltip._active.length) {
              const ctx = chart.ctx;
              const x = chart.tooltip._active[0].element.x;
              const topY = chart.scales.y.top;
              const bottomY = chart.scales.y.bottom;

              // Gradient vertical
              const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
              grad.addColorStop(0, 'rgba(255,255,255,0.6)');
              grad.addColorStop(1, 'rgba(255,255,255,0.0)');

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, topY);
              ctx.lineTo(x, bottomY);
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = grad;
              ctx.stroke();

              // Point blanc en haut
              ctx.beginPath();
              ctx.arc(x, topY + 2, 4, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.fill();
              ctx.restore();
            }
          }
        }
      ]
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
