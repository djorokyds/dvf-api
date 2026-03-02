// pages/api/dvf.js
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche, prixBien, transactions) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2 } = data;

  // Fiabilité
  const nb = transactions.length;
  let fiabilite, fiabiliteEmoji;
  if (nb >= 15) { fiabilite = 'Forte fiabilité'; fiabiliteEmoji = '🟢'; }
  else if (nb >= 5) { fiabilite = 'Fiabilité moyenne'; fiabiliteEmoji = '🟡'; }
  else { fiabilite = 'Fiabilité faible'; fiabiliteEmoji = '🔴'; }

  // Tension marché : section principale + sections voisines
  const sections = [...new Set(transactions.map(t => t.cle_section))];
  const nbTransactionsSection = transactions.filter(t => sections.includes(t.cle_section)).length;

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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>DVF - ${ville}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<style>
body { font-family:sans-serif; background:#f5f7fa; margin:0; }
#map { height:400px; margin:10px; border-radius:12px; }
.badge.maison { background:#e8f5e9;color:#2e7d32; }
.badge.appart { background:#e3f2fd;color:#1565c0; }
.score-bar { position:relative; background:#f0f0f0;border-radius:20px;height:16px;width:80px;overflow:hidden; }
.score-fill { height:100%; border-radius:20px; background: linear-gradient(90deg,#f39c12,#2ecc71); }
.score-label { position:absolute; top:0; left:0; right:0; text-align:center; font-size:9px; line-height:16px; font-weight:600; color:#333; }
table { width:100%; border-collapse:collapse; font-size:12px; margin:10px; }
th,td { padding:6px; border-bottom:1px solid #eee; text-align:left; }
th { background:#f8f9fa; font-size:10px; color:#888; text-transform:uppercase; }
</style>
</head>
<body>
<h3>📍 ${adresse_normalisee} • ${ville} (${code_postal})</h3>
<div id="map"></div>
<h4>Transactions similaires (top ${transactions.length})</h4>
<table>
<thead><tr><th>Type</th><th>Surface</th><th>Prix</th><th>€/m²</th><th>Pièces</th><th>Distance</th><th>Score</th><th>Date</th></tr></thead>
<tbody>${rows}</tbody>
</table>

<script>
const map = L.map('map').setView([${userLat}, ${userLon}], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);
L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('📍 Votre adresse');

const markers = L.markerClusterGroup();
${transactions.map((t, i) => `
  const marker${i} = L.circleMarker([${t.latitude}, ${t.longitude}], {
    radius: 8 + (${t.score}/20),
    fillColor: '${t.type_bien === 'Maison' ? '#2ecc71' : '#3498db'}',
    color: 'white', weight: 2, opacity: 1, fillOpacity: 0.9
  }).bindPopup(\`
    <strong>#${i+1} ${t.type_bien}</strong> • Score: ${t.score}/100<br>
    🏠 ${t.surface} m² • ${t.nb_pieces || '?'} pièces<br>
    💰 ${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €<br>
    📊 ${t.prix_m2} €/m²<br>
    📅 ${t.date_mutation}<br>
    📍 ${t.distance_m} m
  \`);
  markers.addLayer(marker${i});
`).join('')}
map.addLayer(markers);
</script>
</body>
</html>`;
}

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

    // Calcul des distances et scores
    const withScore = transactionsRaw
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => {
        const distanceKm = haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude));
        return { ...t, distance_km: distanceKm, distance_m: Math.round(distanceKm * 1000), score: scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) };
      })
      .filter(t => t.distance_m <= 1000)  // Distance étendue à 1 km
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);  // Top 20 transactions

    const prix_median = withScore.length > 0 ? withScore[0].prix_median_section || 0 : 0;
    const section_cadastrale = withScore.length > 0 ? withScore[0].section_cadastrale : null;

    const responseData = {
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      prix_median_m2: prix_median,
    };

    if (format === 'html') {
      const html = generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche, prixBienNum, withScore);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({ ...responseData, transactions: withScore });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
