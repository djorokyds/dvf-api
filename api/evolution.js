function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function generateEvolutionHTML(adresse_normalisee, ville, code_postal, section_cadastrale, type_bien, chartData, tendance) {
  const labels = chartData.map(d => d.annee);
  const values = chartData.map(d => d.prix_median);
  const volumes = chartData.map(d => d.nb_transactions);

  // Projection 2025-2026
  const projectionHTML = tendance ? `
    <div class="projection-box">
      <div class="proj-label">📈 Tendance annuelle</div>
      <div class="proj-value" style="color:${tendance.pct > 0 ? '#27ae60' : '#e74c3c'}">
        ${tendance.pct > 0 ? '+' : ''}${tendance.pct.toFixed(1)}% / an
      </div>
      <div class="proj-detail">
        Projection 2025 : <strong>${tendance.proj2025.toLocaleString('fr-FR')} €/m²</strong><br>
        Projection 2026 : <strong>${tendance.proj2026.toLocaleString('fr-FR')} €/m²</strong>
      </div>
    </div>
  ` : '';

  const anneeRows = chartData.map(d => `
    <tr>
      <td><strong>${d.annee}</strong></td>
      <td>${d.prix_median.toLocaleString('fr-FR')} €/m²</td>
      <td>${d.nb_transactions} ventes</td>
      <td style="color:${d.evolution > 0 ? '#27ae60' : d.evolution < 0 ? '#e74c3c' : '#888'}">
        ${d.evolution !== null ? (d.evolution > 0 ? '+' : '') + d.evolution.toFixed(1) + '%' : '-'}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Évolution DVF - ${ville}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    .header { background: linear-gradient(135deg, #2c3e50, #8e44ad); color: white; padding: 20px 16px; }
    .header h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.8; }
    .badge-section { display: inline-block; margin-top: 8px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-size: 11px; }
    .chart-box { margin: 14px; background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .chart-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 12px; }
    .chart-wrap { position: relative; height: 220px; }
    .projection-box { margin: 0 14px 14px; background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #8e44ad; }
    .proj-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .proj-value { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .proj-detail { font-size: 12px; color: #666; line-height: 1.8; }
    .section-title { padding: 0 14px 8px; font-size: 13px; font-weight: 600; color: #555; }
    .table-wrap { padding: 0 14px 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12px; }
    th { background: #f8f9fa; padding: 9px 10px; text-align: left; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    .no-data { text-align: center; padding: 30px; color: #888; font-size: 13px; }
    .footer { text-align: center; padding: 14px; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📈 Évolution des prix</h1>
    <p>${adresse_normalisee}</p>
    <p>${ville} • ${code_postal}</p>
    <span class="badge-section">Section ${section_cadastrale || 'N/A'} • ${type_bien || 'Tous types'}</span>
  </div>

  <div class="chart-box">
    <div class="chart-title">Prix médian au m² par année</div>
    <div class="chart-wrap">
      <canvas id="chart"></canvas>
    </div>
  </div>

  ${projectionHTML}

  <div class="section-title">📊 Détail par année</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Année</th>
          <th>Prix médian</th>
          <th>Volume</th>
          <th>Évolution</th>
        </tr>
      </thead>
      <tbody>${anneeRows}</tbody>
    </table>
  </div>

  <div class="footer">Source : Demandes de Valeurs Foncières (DVF) • Données officielles</div>

  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    
    const labels = ${JSON.stringify(labels)};
    const values = ${JSON.stringify(values)};
    const volumes = ${JSON.stringify(volumes)};

    // Points de projection
    const projLabels = [...labels, '2025*', '2026*'];
    const projValues = [...values, ${tendance ? tendance.proj2025 : 'null'}, ${tendance ? tendance.proj2026 : 'null'}];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: projLabels,
        datasets: [
          {
            label: 'Prix médian €/m²',
            data: projValues,
            borderColor: '#8e44ad',
            backgroundColor: 'rgba(142,68,173,0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: projLabels.map((l, i) => l.includes('*') ? 'rgba(142,68,173,0.4)' : '#8e44ad'),
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 6,
            fill: true,
            tension: 0.3,
            segment: {
              borderDash: (ctx) => ctx.p1DataIndex >= values.length ? [6, 4] : []
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.y ? ctx.parsed.y.toLocaleString('fr-FR') + ' €/m²' + (ctx.label.includes('*') ? ' (projection)' : '') : 'N/A'
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => v.toLocaleString('fr-FR') + ' €'
            },
            grid: { color: '#f0f0f0' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const { adresse, type_bien, format } = req.query;
  
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  
  if (!adresse) {
    return res.status(400).json({ error: "adresse manquante" });
  }

  try {
    // Étape 1 : Géocoder l'adresse
    const geoRes = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`
    );
    const geoData = await geoRes.json();
    
    if (!geoData.features || geoData.features.length === 0) {
      return res.status(404).json({ error: "Adresse non trouvée" });
    }

    const feature = geoData.features[0];
    const score = feature.properties.score;
    
    if (score < 0.7) {
      return res.status(400).json({ error: "Adresse non reconnue", score });
    }

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';
    const ville = feature.properties.city;
    const adresse_normalisee = feature.properties.label;

    // Étape 2 : Récupérer toutes les transactions du code postal
    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,type_bien,prix_m2,section_cadastrale,cle_section,latitude,longitude&limit=1000`;
    
    if (type_bien) {
      url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;
    }

    const supaRes = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });

    const transactions = await supaRes.json();

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: "Aucune transaction trouvée" });
    }

    // Étape 3 : Trouver la section la plus proche
    const withDistance = transactions
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => ({
        ...t,
        distance_m: Math.round(haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude)) * 1000)
      }))
      .sort((a, b) => a.distance_m - b.distance_m);

    const sectionPrincipale = withDistance.length > 0 ? withDistance[0].cle_section : null;
    const section_cadastrale = withDistance.length > 0 ? withDistance[0].section_cadastrale : null;

    // Étape 4 : Filtrer sur la section principale et grouper par année
    const sectionTransactions = transactions.filter(t => t.cle_section === sectionPrincipale);

    // Parser l'année depuis date_mutation format JJ/MM/AAAA
    const parAnnee = {};
    sectionTransactions.forEach(t => {
      const parts = (t.date_mutation || '').split('/');
      const annee = parts.length === 3 ? parseInt(parts[2]) : null;
      if (!annee) return;
      if (!parAnnee[annee]) parAnnee[annee] = [];
      if (t.prix_m2 > 0) parAnnee[annee].push(t.prix_m2);
    });

    // Calculer médiane par année
    const median = arr => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? Math.round((sorted[mid-1] + sorted[mid]) / 2)
        : sorted[mid];
    };

    const chartData = Object.keys(parAnnee)
      .map(a => parseInt(a))
      .sort()
      .map((annee, i, arr) => {
        const prix = median(parAnnee[annee]);
        const prixPrecedent = i > 0 ? median(parAnnee[arr[i-1]]) : null;
        const evolution = prixPrecedent ? ((prix - prixPrecedent) / prixPrecedent) * 100 : null;
        return {
          annee,
          prix_median: prix,
          nb_transactions: parAnnee[annee].length,
          evolution
        };
      });

    // Étape 5 : Calculer tendance et projection
    let tendance = null;
    if (chartData.length >= 2) {
      const first = chartData[0];
      const last = chartData[chartData.length - 1];
      const nbAnnees = last.annee - first.annee;
      const pctTotal = ((last.prix_median - first.prix_median) / first.prix_median) * 100;
      const pctAnnuel = pctTotal / nbAnnees;
      const proj2025 = Math.round(last.prix_median * (1 + pctAnnuel / 100));
      const proj2026 = Math.round(proj2025 * (1 + pctAnnuel / 100));
      tendance = { pct: pctAnnuel, proj2025, proj2026 };
    }

    if (format === 'html') {
      const html = generateEvolutionHTML(adresse_normalisee, ville, code_postal, section_cadastrale, type_bien, chartData, tendance);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      chartData,
      tendance
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
