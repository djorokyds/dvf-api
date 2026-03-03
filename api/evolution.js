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

function generateEvolutionHTML(adresse_normalisee, ville, code_postal, section_cadastrale, type_bien, chartDataSection, chartDataVille) {
  
  // Décider quelle donnée afficher
  const hasSection = chartDataSection.length >= 2;
  const hasVille = chartDataVille.length >= 2;

  if (!hasSection && !hasVille) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Évolution DVF</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .box { background: white; border-radius: 12px; padding: 30px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); max-width: 300px; }
    h2 { font-size: 16px; margin-bottom: 8px; color: #2c3e50; }
    p { font-size: 13px; color: #888; line-height: 1.6; }
    .year { font-size: 28px; font-weight: 700; color: #8e44ad; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="box">
    <h2>📊 Données insuffisantes</h2>
    <p>Pas assez de données pour afficher l'évolution.</p>
    <div class="year">${chartDataSection[0]?.prix_median?.toLocaleString('fr-FR') || chartDataVille[0]?.prix_median?.toLocaleString('fr-FR') || '-'} €/m²</div>
    <p>Importez les données 2020-2023 pour voir l'évolution.</p>
  </div>
</body>
</html>`;
  }

  // Si section insuffisante → ville uniquement
  // Si section suffisante → section + ville si dispo
  const showSection = hasSection;
  const showVille = hasVille;
  const modeVilleOnly = !hasSection && hasVille;

  const activeSection = showSection ? chartDataSection : [];
  const activeVille = showVille ? chartDataVille : [];

  const tousLesMois = [...new Set([
    ...activeSection.map(d => d.mois),
    ...activeVille.map(d => d.mois)
  ])].sort();

  const sectionMap = Object.fromEntries(activeSection.map(d => [d.mois, d]));
  const villeMap = Object.fromEntries(activeVille.map(d => [d.mois, d]));

  const labels = tousLesMois.map(m => {
    const [annee, mois] = m.split('-');
    return `${mois}/${annee}`;
  });
  const valuesSection = tousLesMois.map(m => sectionMap[m]?.prix_median || null);
  const valuesVille = tousLesMois.map(m => villeMap[m]?.prix_median || null);

  const datasets = [];
  if (showSection) {
    datasets.push({
      label: `Section ${section_cadastrale || 'N/A'}`,
      data: valuesSection,
      borderColor: '#8e44ad',
      backgroundColor: 'rgba(142,68,173,0.08)',
      borderWidth: 2.5,
      pointBackgroundColor: '#8e44ad',
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: true,
      tension: 0.3,
      spanGaps: true
    });
  }
  if (showVille) {
    datasets.push({
      label: ville,
      data: valuesVille,
      borderColor: '#3498db',
      backgroundColor: showSection ? 'transparent' : 'rgba(52,152,219,0.08)',
      borderWidth: 2,
      borderDash: showSection ? [6, 4] : [],
      pointBackgroundColor: '#3498db',
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      pointRadius: 3,
      fill: !showSection,
      tension: 0.3,
      spanGaps: true
    });
  }

  const tableRows = tousLesMois.map(m => {
    const s = sectionMap[m];
    const v = villeMap[m];
    const [annee, mois] = m.split('-');
    return `
      <tr>
        <td><strong>${mois}/${annee}</strong></td>
        ${showSection ? `<td>${s ? s.prix_median.toLocaleString('fr-FR') + ' €/m²' : '-'}</td><td>${s ? s.nb_transactions + ' ventes' : '-'}</td>` : ''}
        ${showVille ? `<td>${v ? v.prix_median.toLocaleString('fr-FR') + ' €/m²' : '-'}</td><td>${v ? v.nb_transactions + ' ventes' : '-'}</td>` : ''}
      </tr>
    `;
  }).reverse().join('');

  const legendHTML = `
    <div class="legend">
      ${showSection ? `
        <div class="legend-item">
          <div class="legend-line" style="background:#8e44ad;"></div>
          Section ${section_cadastrale || 'N/A'}
        </div>` : ''}
      ${showVille ? `
        <div class="legend-item">
          <div class="legend-line" style="${showSection ? 'background:#3498db;border-top:2px dashed #3498db;' : 'background:#3498db;'}"></div>
          ${ville}${modeVilleOnly ? ' (section insuffisante)' : ''}
        </div>` : ''}
    </div>
  `;

  const thSection = showSection ? `<th>Section ${section_cadastrale || 'N/A'} — Prix</th><th>Vol.</th>` : '';
  const thVille = showVille ? `<th>${ville} — Prix</th><th>Vol.</th>` : '';

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
    .header p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
    .badge-section { display: inline-block; margin-top: 8px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-size: 11px; }
    .chart-box { margin: 14px; background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .chart-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
    .legend { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555; }
    .legend-line { width: 24px; height: 3px; border-radius: 2px; }
    .chart-wrap { position: relative; height: 240px; }
    .note { padding: 0 14px 8px; font-size: 10px; color: #aaa; }
    .section-title { padding: 0 14px 8px; font-size: 13px; font-weight: 600; color: #555; }
    .table-wrap { padding: 0 14px 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12px; }
    th { background: #f8f9fa; padding: 9px 10px; text-align: left; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
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
    <div class="chart-title">Prix médian au m² par mois</div>
    ${legendHTML}
    <div class="chart-wrap">
      <canvas id="chart"></canvas>
    </div>
  </div>

  <p class="note">* Seuls les mois avec ≥ 3 transactions sont affichés</p>

  <div class="section-title">📊 Détail par mois</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Mois</th>
          ${thSection}
          ${thVille}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="footer">Source : Demandes de Valeurs Foncières (DVF) • Données officielles</div>

  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(datasets)}
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.parsed.y
                ? ctx.dataset.label + ' : ' + ctx.parsed.y.toLocaleString('fr-FR') + ' €/m²'
                : 'N/A'
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: (v) => v.toLocaleString('fr-FR') + ' €' },
            grid: { color: '#f0f0f0' }
          },
          x: {
            ticks: { maxTicksLimit: 12, maxRotation: 45 },
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

    // Étape 2 : Trouver la section la plus proche
    const proxyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=section_cadastrale,cle_section,latitude,longitude&latitude=not.is.null&longitude=not.is.null&order=date_mutation.desc.nullslast&limit=1000`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    const proxyTransactions = await proxyRes.json();

    if (!proxyTransactions || proxyTransactions.length === 0) {
      return res.status(404).json({ error: "Aucune transaction trouvée" });
    }

    const withDistance = proxyTransactions
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => ({
        ...t,
        distance_m: Math.round(haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude)) * 1000)
      }))
      .sort((a, b) => a.distance_m - b.distance_m);

    const sectionPrincipale = withDistance.length > 0 ? withDistance[0].cle_section : null;
    const section_cadastrale = withDistance.length > 0 ? withDistance[0].section_cadastrale : null;

    if (!sectionPrincipale) {
      return res.status(404).json({ error: "Section cadastrale introuvable" });
    }

    // Étape 3 : Toutes les transactions de la section
    let sectionUrl = `${SUPABASE_URL}/rest/v1/transactions?cle_section=eq.${sectionPrincipale}&select=date_mutation,prix_m2&order=date_mutation.desc.nullslast`;
    if (type_bien) sectionUrl += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const sectionRes = await fetch(sectionUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });
    const sectionTransactions = await sectionRes.json();

    // Étape 4 : Toutes les transactions de la ville
    let villeUrl = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,prix_m2&order=date_mutation.desc.nullslast`;
    if (type_bien) villeUrl += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const villeRes = await fetch(villeUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });
    const villeTransactions = await villeRes.json();

    // Étape 5 : Grouper par mois AAAA-MM (min 3 transactions)
    const median = arr => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[mid-1] + sorted[mid]) / 2)
        : sorted[mid];
    };

    const groupByMonth = (transactions) => {
      const parMois = {};
      transactions.forEach(t => {
        const date = t.date_mutation || '';
        if (date.length < 7) return;
        const mois = date.substring(0, 7);
        if (!parMois[mois]) parMois[mois] = [];
        if (t.prix_m2 > 0) parMois[mois].push(t.prix_m2);
      });
      return Object.keys(parMois)
        .sort()
        .filter(mois => parMois[mois].length >= 3)
        .map(mois => ({
          mois,
          prix_median: median(parMois[mois]),
          nb_transactions: parMois[mois].length
        }));
    };

    const chartDataSection = groupByMonth(sectionTransactions || []);
    const chartDataVille = groupByMonth(villeTransactions || []);

    if (format === 'html') {
      const html = generateEvolutionHTML(adresse_normalisee, ville, code_postal, section_cadastrale, type_bien, chartDataSection, chartDataVille);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      chartDataSection,
      chartDataVille
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
