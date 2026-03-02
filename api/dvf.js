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

function scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) {
  const distanceM = distanceKm * 1000;
  const scoreDistance = Math.max(0, 40 - (distanceM / 500) * 40);
  let scoreSurface = 35;
  if (surfaceRecherche && t.surface) {
    const ecartSurface = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 35 - ecartSurface * 70);
  }
  let scorePieces = 25;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecartPieces = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 25 - ecartPieces * 10);
  }
  return Math.round(scoreDistance + scoreSurface + scorePieces);
}

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche, prixRecherche) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2, transactions, stats, fiabilite, tension } = data;
  
  const rows = transactions.map((t, i) => `
    <tr>
      <td><span class="badge ${t.type_bien === 'Maison' ? 'maison' : 'appart'}">${t.type_bien}</span></td>
      <td>${t.surface} m²</td>
      <td>${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €</td>
      <td><strong>${t.prix_m2} €/m²</strong></td>
      <td>${t.nb_pieces || '-'}</td>
      <td>${t.distance_m} m</td>
      <td>
        <div class="score-bar">
          <div class="score-fill" style="width:${t.score}%"></div>
          <span class="score-label">${t.score}/100</span>
        </div>
      </td>
      <td>${t.date_mutation}</td>
    </tr>
  `).join('');

  // Calcul prix recommandé et écart
  const prixRecommande = surfaceRecherche ? Math.round(prix_median_m2 * surfaceRecherche) : null;
  const fMin = surfaceRecherche ? Math.round(stats.p25 * surfaceRecherche) : null;
  const fMax = surfaceRecherche ? Math.round(stats.p75 * surfaceRecherche) : null;
  
  let ecartHTML = "";
  if (prixRecherche && surfaceRecherche) {
    const monPrixM2 = prixRecherche / surfaceRecherche;
    const ecart = ((monPrixM2 - prix_median_m2) / prix_median_m2) * 100;
    const color = ecart > 0 ? '#e74c3c' : '#2ecc71';
    ecartHTML = `<div style="font-size:12px; font-weight:700; color:${color}; margin-top:10px;">
      ${ecart > 0 ? '🔴' : '🟢'} ${Math.abs(Math.round(ecart))}% ${ecart > 0 ? 'au-dessus' : 'sous'} le marché
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DVF - ${ville}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; color: #333; }
    .header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 20px 16px; }
    .header h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.8; }
    .fiabilite-tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-top: 10px; }
    .f-forte { background: #e8f5e9; color: #2e7d32; } .f-moyenne { background: #fffde7; color: #f57f17; } .f-faible { background: #ffebee; color: #c62828; }
    .criteres { display: flex; gap: 8px; align-items: center; padding: 10px 14px; flex-wrap: wrap; }
    .critere { background: #e8f0fe; color: #1a73e8; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
    .card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; color: #2c3e50; }
    .card.highlight { background: white; border: 2px solid #3498db; grid-column: 1 / -1; }
    .card.highlight .value { color: #3498db; font-size: 24px; }
    #map { height: 300px; margin: 0 14px 14px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section-title { padding: 0 14px 8px; font-size: 13px; font-weight: 600; color: #555; }
    .table-wrap { padding: 0 14px 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; font-size: 11px; }
    th { background: #f8f9fa; padding: 9px 10px; text-align: left; color: #888; border-bottom: 1px solid #eee; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 9px; font-weight: 600; }
    .badge.maison { background: #e8f5e9; color: #2e7d32; } .badge.appart { background: #e3f2fd; color: #1565c0; }
    .score-bar { position: relative; background: #f0f0f0; border-radius: 20px; height: 12px; width: 60px; overflow: hidden; }
    .score-fill { height: 100%; background: linear-gradient(90deg, #f39c12, #2ecc71); }
    .score-label { position: absolute; top: 0; width: 100%; text-align: center; font-size: 8px; line-height: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📍 ${adresse_normalisee}</h1>
    <p>${ville} • ${code_postal}</p>
    <div class="fiabilite-tag ${fiabilite.class}">${fiabilite.icon} Fiabilité : ${fiabilite.label}</div>
  </div>

  <div class="criteres">
    <span class="critere">Médiane : ${prix_median_m2.toLocaleString('fr-FR')} €/m²</span>
    <span class="critere">Tension : ${tension.label}</span>
  </div>

  <div class="cards">
    ${prixRecommande ? `
    <div class="card highlight">
      <div class="label">💡 Prix recommandé</div>
      <div class="value">${prixRecommande.toLocaleString('fr-FR')} €</div>
      <div style="font-size:11px; color:#666; margin-top:4px;">Fourchette réaliste : ${fMin.toLocaleString('fr-FR')}€ – ${fMax.toLocaleString('fr-FR')}€</div>
      ${ecartHTML}
    </div>` : ''}
    <div class="card">
      <div class="label">Volume 500m</div>
      <div class="value">${transactions.length}</div>
      <div style="font-size:10px; color:#888;">ventes analysées</div>
    </div>
    <div class="card">
      <div class="label">Quartile Bas</div>
      <div class="value">${Math.round(stats.p25).toLocaleString('fr-FR')} €</div>
      <div style="font-size:10px; color:#888;">€/m²</div>
    </div>
  </div>

  <div class="section-title">🗺️ Carte du marché</div>
  <div id="map"></div>

  <div class="section-title">🏠 Transactions similaires</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Type</th><th>Surf.</th><th>Prix</th><th>€/m²</th><th>Dist.</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <script>
    const map = L.map('map').setView([${userLat}, ${userLon}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.circle([${userLat}, ${userLon}], { radius: 500, color: '#e74c3c', weight: 1, fillOpacity: 0.05 }).addTo(map);
    L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('Votre adresse').openPopup();

    ${transactions.map((t, i) => `
      L.circleMarker([${t.latitude}, ${t.longitude}], {
        radius: 7 + (${t.score} / 25),
        fillColor: '${t.type_bien === 'Maison' ? '#2ecc71' : '#3498db'}',
        color: 'white', weight: 1, fillOpacity: 0.8
      }).addTo(map).bindPopup(\`<b>\${t.prix_m2} €/m²</b><br>\${t.surface} m² - \${t.date_mutation}\`);
    `).join('')}
  </script>
</body></html>`;
}

export default async function handler(req, res) {
  const { adresse, type_bien, surface, nb_pieces, prix, format } = req.query;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });

  try {
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features?.length) return res.status(404).json({ error: "Adresse non trouvée" });

    const feature = geoData.features[0];
    const { coordinates } = feature.geometry;
    const { postcode, city, label } = feature.properties;

    const surfaceRecherche = surface ? parseFloat(surface) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;
    const prixRecherche = prix ? parseFloat(prix) : null;

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${postcode}&select=*&limit=500`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
    const allTransactions = await supaRes.json();

    // Traitement 500m + Score
    const scored = allTransactions
      .filter(t => t.latitude && t.longitude)
      .map(t => {
        const dKm = haversine(coordinates[1], coordinates[0], t.latitude, t.longitude);
        return { ...t, distance_m: Math.round(dKm * 1000), score: scoreTransaction(t, dKm, surfaceRecherche, nbPiecesRecherche) };
      })
      .filter(t => t.distance_m <= 500)
      .sort((a, b) => b.score - a.score);

    const top10 = scored.slice(0, 10);
    const prices = scored.map(t => t.prix_m2).sort((a, b) => a - b);
    
    // Stats
    const median = prices[Math.floor(prices.length / 2)] || 0;
    const p25 = prices[Math.floor(prices.length * 0.25)] || 0;
    const p75 = prices[Math.floor(prices.length * 0.75)] || 0;

    // Indicateurs
    const fiabilite = scored.length >= 15 ? { label: 'Forte', class: 'f-forte', icon: '🟢' } :
                      (scored.length >= 5 ? { label: 'Moyenne', class: 'f-moyenne', icon: '🟡' } :
                      { label: 'Faible', class: 'f-faible', icon: '🔴' });
    
    const tension = scored.length > 20 ? { label: 'Élevée' } : (scored.length > 8 ? { label: 'Normale' } : { label: 'Calme' });

    const responseData = {
      adresse_normalisee: label, ville: city, code_postal: postcode,
      prix_median_m2: median, stats: { p25, p75 },
      fiabilite, tension, transactions: top10
    };

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(generateHTML(responseData, coordinates[1], coordinates[0], surfaceRecherche, nbPiecesRecherche, prixRecherche));
    }
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
