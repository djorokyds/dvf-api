/**
 * FONCTIONS UTILITAIRES & STATISTIQUES
 */
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

function getQuartile(values, q) {
  if (values.length === 0) return 0;
  const sorted = values.sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
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

/**
 * GENERATION DU HTML
 */
function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche) {
  const { 
    adresse_normalisee, ville, code_postal, transactions, 
    stats, fiabilite, estimation 
  } = data;
  
  const rows = transactions.map((t, i) => {
    const ecart = stats.mediane > 0 ? ((t.prix_m2 - stats.mediane) / stats.mediane) * 100 : 0;
    const ecartClass = ecart <= 0 ? 'text-green' : 'text-red';
    const ecartSign = ecart > 0 ? '+' : '';

    return `
    <tr>
      <td><span class="badge ${t.type_bien === 'Maison' ? 'maison' : 'appart'}">${t.type_bien}</span></td>
      <td>${t.surface} m²</td>
      <td>${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €</td>
      <td>
        <strong>${t.prix_m2} €/m²</strong><br>
        <small class="${ecartClass}">${ecartSign}${Math.round(ecart)}% / marché</small>
      </td>
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
  `}).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyse DVF - ${adresse_normalisee}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f0f2f5; color: #1a1a1a; line-height: 1.4; }
    .header { background: #2c3e50; color: white; padding: 25px 20px; text-align: center; }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    
    .container { max-width: 1000px; margin: 0 auto; padding: 15px; }
    
    /* Fiabilité & Info */
    .fiabilite-banner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: 600; font-size: 14px; }
    .f-haute { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
    .f-moyenne { background: #fffde7; color: #f57f17; border: 1px solid #fff9c4; }
    .f-faible { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }

    /* Estimation Card */
    .estime-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 20px; border-left: 6px solid #3498db; }
    .estime-title { color: #7f8c8d; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 10px; }
    .estime-value { font-size: 32px; font-weight: 800; color: #2c3e50; }
    .estime-range { font-size: 14px; color: #666; margin-top: 5px; }

    .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-box { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .stat-box .label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
    .stat-box .val { font-size: 18px; font-weight: 700; }

    #map { height: 350px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    
    .table-wrap { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8f9fa; padding: 15px 10px; text-align: left; color: #7f8c8d; font-size: 11px; text-transform: uppercase; }
    td { padding: 15px 10px; border-top: 1px solid #eee; }
    
    .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .maison { background: #e8f5e9; color: #2e7d32; }
    .appart { background: #e3f2fd; color: #1565c0; }
    .text-green { color: #27ae60; font-weight: 600; }
    .text-red { color: #e74c3c; font-weight: 600; }

    .score-bar { background: #eee; height: 8px; border-radius: 4px; width: 60px; position: relative; margin-top: 5px; }
    .score-fill { background: #2ecc71; height: 100%; border-radius: 4px; }
    .score-label { font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analyse Immobilière</h1>
    <p>📍 ${adresse_normalisee}</p>
  </div>

  <div class="container">
    <div class="fiabilite-banner ${fiabilite.class}">
      ${fiabilite.icon} Fiabilité de l'analyse : ${fiabilite.label} (${transactions.length} ventes)
    </div>

    ${surfaceRecherche ? `
    <div class="estime-card">
      <div class="estime-title">💡 Prix Recommandé pour ${surfaceRecherche} m²</div>
      <div class="estime-value">${Math.round(estimation.prix).toLocaleString('fr-FR')} €</div>
      <div class="estime-range">
        Fourchette de marché (P25 - P75) : 
        <strong>${Math.round(estimation.min).toLocaleString('fr-FR')} €</strong> – 
        <strong>${Math.round(estimation.max).toLocaleString('fr-FR')} €</strong>
      </div>
    </div>
    ` : ''}

    <div class="grid-stats">
      <div class="stat-box">
        <div class="label">Prix Médian</div>
        <div class="val">${Math.round(stats.mediane).toLocaleString('fr-FR')} €/m²</div>
      </div>
      <div class="stat-box">
        <div class="label">Quartile Bas (P25)</div>
        <div class="val">${Math.round(stats.p25).toLocaleString('fr-FR')} €/m²</div>
      </div>
      <div class="stat-box">
        <div class="label">Quartile Haut (P75)</div>
        <div class="val">${Math.round(stats.p75).toLocaleString('fr-FR')} €/m²</div>
      </div>
    </div>

    <div id="map"></div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Surface</th>
            <th>Prix Net</th>
            <th>Prix m²</th>
            <th>Pièces</th>
            <th>Distance</th>
            <th>Match</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <script>
    const map = L.map('map').setView([${userLat}, ${userLon}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    L.circle([${userLat}, ${userLon}], { radius: 500, color: '#e74c3c', fillOpacity: 0.05 }).addTo(map);
    L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('Votre recherche').openPopup();

    ${transactions.map(t => `
      L.circleMarker([${t.latitude}, ${t.longitude}], {
        radius: 10, fillColor: '${t.type_bien === 'Maison' ? '#2ecc71' : '#3498db'}',
        color: 'white', weight: 2, fillOpacity: 0.8
      }).addTo(map).bindPopup('${t.prix_m2} €/m² - ${t.surface}m²');
    `).join('')}
  </script>
</body>
</html>`;
}

/**
 * HANDLER PRINCIPAL
 */
export default async function handler(req, res) {
  const { adresse, type_bien, surface, nb_pieces, format } = req.query;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });

  try {
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features?.length) return res.status(404).json({ error: "Adresse non trouvée" });

    const feature = geoData.features[0];
    const { coordinates } = feature.geometry;
    const [lon, lat] = coordinates;
    const code_postal = feature.properties.postcode?.trim();
    const surfaceRecherche = surface ? parseFloat(surface) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=*&limit=1000`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const allTransactions = await supaRes.json();

    // 1. Filtrage géographique & Scoring
    const filtered = allTransactions
      .filter(t => t.latitude && t.longitude)
      .map(t => {
        const dKm = haversine(lat, lon, t.latitude, t.longitude);
        return {
          ...t,
          distance_m: Math.round(dKm * 1000),
          score: scoreTransaction(t, dKm, surfaceRecherche, nbPiecesRecherche)
        };
      })
      .filter(t => t.distance_m <= 500)
      .sort((a, b) => b.score - a.score);

    const topTransactions = filtered.slice(0, 15);
    const prixM2List = topTransactions.map(t => t.prix_m2);

    // 2. Calculs Statistiques
    const stats = {
      p25: getQuartile(prixM2List, 0.25),
      mediane: getQuartile(prixM2List, 0.5),
      p75: getQuartile(prixM2List, 0.75)
    };

    // 3. Fiabilité
    let fiabilite = { label: 'Faible', class: 'f-faible', icon: '🔴' };
    if (topTransactions.length >= 15) fiabilite = { label: 'Forte', class: 'f-haute', icon: '🟢' };
    else if (topTransactions.length >= 5) fiabilite = { label: 'Moyenne', class: 'f-moyenne', icon: '🟡' };

    // 4. Estimation recommandée
    const estimation = surfaceRecherche ? {
      prix: stats.mediane * surfaceRecherche,
      min: stats.p25 * surfaceRecherche,
      max: stats.p75 * surfaceRecherche
    } : null;

    const responseData = {
      adresse_normalisee: feature.properties.label,
      ville: feature.properties.city,
      code_postal,
      stats,
      fiabilite,
      estimation,
      transactions: topTransactions
    };

    if (format === 'html') {
      return res.status(200).send(generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche));
    }
    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
