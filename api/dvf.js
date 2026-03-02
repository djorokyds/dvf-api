function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) {
  const distanceM = distanceKm * 1000;
  const scoreDistance = Math.max(0, 40 - (distanceM / 500) * 40);
  let scoreSurface = 35;
  if (surfaceRecherche && t.surface) {
    const ecart = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 35 - ecart * 70);
  }
  let scorePieces = 25;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecart = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 25 - ecart * 10);
  }
  return Math.round(scoreDistance + scoreSurface + scorePieces);
}

function arrondiMillier(n) {
  return Math.round(n / 1000) * 1000;
}

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche, prixBien, transactions, nbTransactionsSection) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2 } = data;
  const nb = transactions.length;

  // Fiabilité
  let fiabilite, fiabiliteEmoji;
  if (nb >= 15) { fiabilite = 'Forte fiabilité'; fiabiliteEmoji = '🟢'; }
  else if (nb >= 5) { fiabilite = 'Fiabilité moyenne'; fiabiliteEmoji = '🟡'; }
  else { fiabilite = 'Fiabilité faible'; fiabiliteEmoji = '🔴'; }

  // Tension marché
  let tension, tensionColor, tensionEmoji, tensionDesc;
  if (nbTransactionsSection > 20) {
    tension = 'Marché tendu'; tensionColor = '#27ae60'; tensionEmoji = '🟢';
    tensionDesc = 'Forte demande — les biens partent vite';
  } else if (nbTransactionsSection >= 10) {
    tension = 'Marché équilibré'; tensionColor = '#f39c12'; tensionEmoji = '🟡';
    tensionDesc = 'Offre et demande équilibrées';
  } else {
    tension = 'Marché calme'; tensionColor = '#e74c3c'; tensionEmoji = '🔴';
    tensionDesc = 'Peu de transactions — marché peu actif';
  }

  // Prix recommandé et fourchette
  let prixRecommandeHTML = '';
  let ecartHTML = '';
  if (surfaceRecherche && prix_median_m2 > 0) {
    const prixRecommande = arrondiMillier(prix_median_m2 * surfaceRecherche);
    const fourchetteBas = arrondiMillier(prixRecommande * 0.9);
    const fourchetteHaut = arrondiMillier(prixRecommande * 1.1);
    
    prixRecommandeHTML = `
      <div class="recommande-box">
        <div class="recommande-label">💡 Prix median (+/- 10%)</div>
        <div class="recommande-value">${prixRecommande.toLocaleString('fr-FR')} €</div>
        <div class="recommande-fourchette">Fourchette réaliste : ${fourchetteBas.toLocaleString('fr-FR')} € – ${fourchetteHaut.toLocaleString('fr-FR')} €</div>
      </div>
    `;

    if (prixBien && prix_median_m2 > 0 && surfaceRecherche > 0) {
      const prixM2Bien = prixBien / surfaceRecherche;
      const ecartPct = ((prixM2Bien - prix_median_m2) / prix_median_m2) * 100;
      const ecartColor = ecartPct < 0 ? '#27ae60' : '#e74c3c';
      const ecartEmoji = ecartPct < 0 ? '🟢' : '🔴';
      const sousOuDessus = ecartPct < 0 ? 'sous le marché' : 'au-dessus du marché';
      
      ecartHTML = `
        <div class="ecart-box" style="border-left: 4px solid ${ecartColor}">
          <div class="ecart-label">Écart vs marché</div>
          <div class="ecart-value" style="color:${ecartColor}">${ecartEmoji} ${ecartPct > 0 ? '+' : ''}${ecartPct.toFixed(1)}% ${sousOuDessus}</div>
          <div class="ecart-detail">Votre bien : ${Math.round(prixM2Bien).toLocaleString('fr-FR')} €/m² vs marché : ${prix_median_m2.toLocaleString('fr-FR')} €/m²</div>
        </div>
      `;
    }
  }

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
    const offsetLat = ${t.latitude} + (Math.random() - 0.5) * 0.00005;
    const offsetLon = ${t.longitude} + (Math.random() - 0.5) * 0.00005;

    L.circleMarker([offsetLat, offsetLon], {
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
      ${prixBien ? `<span class="critere">${Math.round(prixBien).toLocaleString('fr-FR')} €</span>` : ''}
      <span class="critere">≤ 1000m</span>
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
/* Conserver exactement les styles précédents ici */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
/* ... (tout le CSS de la version précédente) ... */
#map { height: 280px; margin: 0 14px 14px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
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
      <div class="label">Prix médian de la section cadastrale au m²</div>
      <div class="value">${prix_median_m2.toLocaleString('fr-FR')} €</div>
      <div class="unit">Section ${section_cadastrale || code_postal} • Données DVF</div>
      <div class="fiabilite">${fiabiliteEmoji} ${fiabilite} • ${nb} transaction${nb > 1 ? 's' : ''} dans la zone</div>
    </div>
  </div>

  <div class="tension-box">
    <div class="tension-left">
      <div class="tension-label">Tension du marché</div>
      <div class="tension-value" style="color:${tensionColor}">${tensionEmoji} ${tension}</div>
      <div class="tension-desc">${tensionDesc}</div>
    </div>
    <div class="tension-nb">
      <div class="nb" style="color:${tensionColor}">${nbTransactionsSection}</div>
      <div class="nb-label">ventes / section / an</div>
    </div>
  </div>

  ${prixRecommandeHTML}
  ${ecartHTML}

  <div class="section-title">🗺️ Carte des transactions</div>
  <div class="legend">
    <span><span class="legend-dot" style="background:#e74c3c;"></span> Votre adresse</span>
    <span><span class="legend-dot" style="background:#2ecc71;"></span> Maison</span>
    <span><span class="legend-dot" style="background:#3498db;"></span> Appartement</span>
  </div>
  <div id="map"></div>

  <div class="section-title">🏠 Transactions similaires</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Type</th><th>Surface</th><th>Prix</th><th>€/m²</th><th>Pièces</th><th>Distance</th><th>Score</th><th>Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <script>
    const map = L.map('map').setView([${userLat}, ${userLon}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.circle([${userLat}, ${userLon}], { radius: 1000, color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.05, weight: 1, dashArray: '5,5' }).addTo(map);
    L.marker([${userLat}, ${userLon}], { icon: L.divIcon({ html: '<div style="background:#e74c3c;width:16px;height:16px;border-radius:50%;border:3px solid white;"></div>', iconSize:[16,16], iconAnchor:[8,8] }) }).addTo(map).bindPopup('<strong>📍 Votre adresse</strong><br>${adresse_normalisee}').openPopup();
    ${markersJS}
  </script>
</body>
</html>`;
}

// Ensuite dans ton handler Next.js, filtre jusqu’à 1000m et top 20 :
export default async function handler(req, res) {
  const { adresse, type_bien, surface, nb_pieces, prix_bien, format } = req.query;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });

  try {
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features || geoData.features.length === 0) return res.status(404).json({ error: "Adresse non trouvée" });

    const feature = geoData.features[0];
    if (feature.properties.score < 0.5) return res.status(400).json({ error: "Adresse non reconnue", score: feature.properties.score });

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';
    const ville = feature.properties.city;
    const adresse_normalisee = feature.properties.label;

    const surfaceRecherche = surface ? parseFloat(surface.replace(/\s/g, '')) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;
    const prixBienNum = prix_bien ? parseFloat(prix_bien.replace(/\s/g, '').replace(',', '.')) : null;

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,adresse,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,section_cadastrale,cle_section,cle_section_type,latitude,longitude&limit=1000`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' } });
    const transactionsRaw = await supaRes.json();
    if (!transactionsRaw || transactionsRaw.length === 0) return res.status(404).json({ error: "Aucune transaction trouvée pour ce code postal" });

    const withScore = transactionsRaw
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => {
        const distanceKm = haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude));
        return { ...t, distance_km: distanceKm, distance_m: Math.round(distanceKm*1000), score: scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) };
      })
      .filter(t => t.distance_m <= 1000)
      .sort((a,b)=>b.score-a.score)
      .slice(0,20);

    const sectionPrincipale = withScore.length>0 ? withScore[0].cle_section : null;
    const nbTransactionsSection = sectionPrincipale ? transactionsRaw.filter(t=>t.cle_section===sectionPrincipale).length : transactionsRaw.length;

    const prix_median = withScore.length>0 ? withScore[0].prix_median_section||0 : 0;
    const section_cadastrale = withScore.length>0 ? withScore[0].section_cadastrale : null;

    const responseData = { success:true, adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2: prix_median };

    if (format==='html') {
      const html = generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche, prixBienNum, withScore, nbTransactionsSection);
      res.setHeader('Content-Type','text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({ ...responseData, transactions: withScore });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
