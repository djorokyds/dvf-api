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
  // Score distance (0-40 points) — max 500m
  const distanceM = distanceKm * 1000;
  const scoreDistance = Math.max(0, 40 - (distanceM / 500) * 40);

  // Score surface (0-35 points) — écart relatif
  let scoreSurface = 35;
  if (surfaceRecherche && t.surface) {
    const ecartSurface = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 35 - ecartSurface * 70);
  }

  // Score pièces (0-25 points) — écart absolu
  let scorePieces = 25;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecartPieces = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 25 - ecartPieces * 10);
  }

  return Math.round(scoreDistance + scoreSurface + scorePieces);
}

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2, transactions } = data;
  
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

  const markersJS = transactions.map((t, i) => `
    L.circleMarker([${t.latitude}, ${t.longitude}], {
      radius: 8 + (${t.score} / 20),
      fillColor: '${t.type_bien === 'Maison' ? '#2ecc71' : '#3498db'}',
      color: 'white',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(\`
      <div style="font-family:sans-serif;min-width:160px">
        <strong>#${i+1} ${t.type_bien}</strong> • Score: ${t.score}/100<br>
        🏠 ${t.surface} m² • ${t.nb_pieces || '?'} pièces<br>
        💰 ${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €<br>
        📊 ${t.prix_m2} €/m²<br>
        📅 ${t.date_mutation}<br>
        📍 ${t.distance_m} m
      </div>
    \`);
  `).join('');

  const criteresHTML = surfaceRecherche || nbPiecesRecherche ? `
    <div class="criteres">
      <span class="critere-label">Recherche :</span>
      ${surfaceRecherche ? `<span class="critere">${surfaceRecherche} m²</span>` : ''}
      ${nbPiecesRecherche ? `<span class="critere">${nbPiecesRecherche} pièces</span>` : ''}
      <span class="critere">≤ 500m</span>
    </div>
  ` : '';

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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    .header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 20px 16px; }
    .header h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.8; }
    .criteres { display: flex; gap: 8px; align-items: center; padding: 10px 14px; flex-wrap: wrap; }
    .critere-label { font-size: 11px; color: #888; }
    .critere { background: #e8f0fe; color: #1a73e8; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
    .card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card .value { font-size: 20px; font-weight: 700; color: #2c3e50; }
    .card .unit { font-size: 11px; color: #888; margin-top: 2px; }
    .card.highlight { background: linear-gradient(135deg, #3498db, #2980b9); color: white; grid-column: 1 / -1; }
    .card.highlight .label { color: rgba(255,255,255,0.7); }
    .card.highlight .value { color: white; font-size: 30px; }
    .card.highlight .unit { color: rgba(255,255,255,0.7); font-size: 11px; }
    #map { height: 300px; margin: 0 14px 14px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section-title { padding: 0 14px 8px; font-size: 13px; font-weight: 600; color: #555; }
    .legend { display: flex; gap: 12px; padding: 0 14px 10px; font-size: 11px; color: #666; flex-wrap: wrap; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .table-wrap { padding: 0 14px 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12px; }
    th { background: #f8f9fa; padding: 9px 10px; text-align: left; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8f9ff; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 10px; font-weight: 500; }
    .badge.maison { background: #e8f5e9; color: #2e7d32; }
    .badge.appart { background: #e3f2fd; color: #1565c0; }
    .score-bar { position: relative; background: #f0f0f0; border-radius: 20px; height: 16px; width: 80px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 20px; background: linear-gradient(90deg, #f39c12, #2ecc71); transition: width 0.3s; }
    .score-label { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 9px; line-height: 16px; font-weight: 600; color: #333; }
    .no-results { text-align: center; padding: 30px; color: #888; font-size: 13px; }
    .footer { text-align: center; padding: 14px; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>

  <div class="header">
    <h1>📍 ${adresse_normalisee}</h1>
    <p>${ville} • ${code_postal} • Section ${section_cadastrale || 'N/A'}</p>
  </div>

  ${criteresHTML}

  <div class="cards">
    <div class="card highlight">
      <div class="label">Prix médian au m²</div>
      <div class="value">${prix_median_m2.toLocaleString('fr-FR')} €</div>
      <div class="unit">Biens similaires • Données DVF 2024</div>
    </div>
    <div class="card">
      <div class="label">Transactions</div>
      <div class="value">${transactions.length}</div>
      <div class="unit">≤ 500m</div>
    </div>
    <div class="card">
      <div class="label">Ville</div>
      <div class="value" style="font-size:15px">${ville}</div>
      <div class="unit">${code_postal}</div>
    </div>
  </div>

  <div class="section-title">🗺️ Carte des transactions</div>
  <div class="legend">
    <span><span class="legend-dot" style="background:#e74c3c;"></span> Votre adresse</span>
    <span><span class="legend-dot" style="background:#2ecc71;"></span> Maison</span>
    <span><span class="legend-dot" style="background:#3498db;"></span> Appartement</span>
    <span style="color:#aaa">• Taille = score de similarité</span>
  </div>
  <div id="map"></div>

  ${transactions.length === 0 ? `
    <div class="no-results">
      Aucune transaction trouvée dans un rayon de 500m.<br>
      Essayez une adresse différente.
    </div>
  ` : `
    <div class="section-title">🏠 Transactions similaires</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Surface</th>
            <th>Prix</th>
            <th>€/m²</th>
            <th>Pièces</th>
            <th>Distance</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `}

  <div class="footer">Source : Demandes de Valeurs Foncières (DVF) • Données officielles 2024</div>

  <script>
    const map = L.map('map').setView([${userLat}, ${userLon}], 16);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Cercle 500m
    L.circle([${userLat}, ${userLon}], {
      radius: 500,
      color: '#e74c3c',
      fillColor: '#e74c3c',
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '5,5'
    }).addTo(map);

    // Marqueur utilisateur
    L.marker([${userLat}, ${userLon}], {
      icon: L.divIcon({
        html: '<div style="background:#e74c3c;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map).bindPopup('<strong>📍 Votre adresse</strong><br>${adresse_normalisee}').openPopup();

    ${markersJS}
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const { adresse, type_bien, surface, nb_pieces, format } = req.query;
  
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

    const surfaceRecherche = surface ? parseFloat(surface) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,adresse,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,section_cadastrale,cle_section,cle_section_type,latitude,longitude&limit=1000`;
    
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
      return res.status(404).json({ error: "Aucune transaction trouvée pour ce code postal" });
    }

    // Filtrer à 500m + scorer
    const withScore = transactions
      .filter(t => t.latitude && t.longitude)
      .map(t => {
        const distanceKm = haversine(lat, lon, t.latitude, t.longitude);
        const distanceM = Math.round(distanceKm * 1000);
        return {
          ...t,
          distance_km: distanceKm,
          distance_m: distanceM,
          score: scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche)
        };
      })
      .filter(t => t.distance_m <= 500)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const prix_median = withScore.length > 0 ? withScore[0].prix_median_section || 0 : 0;
    const section_cadastrale = withScore.length > 0 ? withScore[0].section_cadastrale : null;

    const responseData = {
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      prix_median_m2: prix_median,
      nb_transactions: withScore.length,
      transactions: withScore
    };

    if (format === 'html') {
      const html = generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
