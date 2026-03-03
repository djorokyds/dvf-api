function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) {
  const distanceM = distanceKm * 1000;
  let scoreDistance = 0;
  if (distanceM <= 500) scoreDistance = 20;
  else if (distanceM <= 1000) scoreDistance = Math.max(0, 20 - ((distanceM - 500) / 500) * 20);

  let scoreSurface = 50;
  if (surfaceRecherche && t.surface) {
    const ecart = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 50 - ecart * 50);
  }

  let scorePieces = 30;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecart = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 30 - ecart * 10);
  }

  return Math.round(scoreDistance + scoreSurface + scorePieces);
}

function arrondiMillier(n) {
  return Math.round(n / 1000) * 1000;
}

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche, prixBien, nbTransactionsSection) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2, transactions } = data;

  const nb = transactions.length;

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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DVF - ${ville}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1f1f1f; color: #eaeaea; }
    .tension-box { margin: 14px; background: #1f1f1f; border-radius: 12px; border: 1px solid #888; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 12px; }
    .tension-left { flex: 1; }
    .tension-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .tension-value { font-size: 16px; font-weight: 700; }
    .tension-desc { font-size: 11px; color: #888; margin-top: 2px; }
    .tension-nb { text-align: right; }
    .tension-nb .nb { font-size: 28px; font-weight: 700; color: #2c3e50; }
    .tension-nb .nb-label { font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <!--
  <div class="header"> ... </div>
  <div class="cards"> ... </div>
  <div class="recommande-box"> ... </div>
  <div class="ecart-box"> ... </div>
  <div id="map"></div>
  <div class="table-wrap"> ... </div>
  -->

  <div class="tension-box">
    <div class="tension-left">
      <div class="tension-label">Tension du marché</div>
      <div class="tension-value" style="color:${tensionColor}">${tensionEmoji} ${tension}</div>
      <div class="tension-desc">${tensionDesc}</div>
    </div>
    <div class="tension-nb">
      <div class="nb" style="color:${tensionColor}">${nbTransactionsSection}</div>
      <div class="nb-label">ventes dans section cadastrale / 1000 dernières ventes dans la ville</div>
    </div>
  </div>
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
    if (feature.properties.score < 0.7) return res.status(400).json({ error: "Adresse non reconnue", score: feature.properties.score });

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';
    const ville = feature.properties.city;
    const adresse_normalisee = feature.properties.label;

    const surfaceRecherche = surface ? parseFloat(surface.replace(/\s/g, '')) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;
    const prixBienNum = prix_bien ? parseFloat(prix_bien.replace(/\s/g, '').replace(',', '.')) : null;

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,section_cadastrale,cle_section,latitude,longitude&order=date_mutation.desc.nullslast&limit=1000`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' } });
    const transactions = await supaRes.json();
    if (!transactions || transactions.length === 0) return res.status(404).json({ error: "Aucune transaction trouvée pour ce code postal" });

    const last1000 = transactions
      .filter(t => t.date_mutation)
      .map(t => ({ ...t, date_obj: new Date(t.date_mutation) }))
      .sort((a, b) => b.date_obj - a.date_obj);

    const withScore = last1000
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => {
        const distanceKm = haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude));
        return { ...t, distance_km: distanceKm, distance_m: Math.round(distanceKm * 1000), score: scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche) };
      })
      .filter(t => t.distance_m <= 1000)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const closestTransaction = withScore[0];
    const sectionPrincipale = closestTransaction ? closestTransaction.cle_section : null;
    const nbTransactionsSection = sectionPrincipale ? transactions.filter(t => t.cle_section === sectionPrincipale).length : transactions.length;

    const responseData = { success: true, adresse_normalisee, ville, code_postal, section_cadastrale: closestTransaction?.section_cadastrale, prix_median_m2: closestTransaction?.prix_median_section || 0, nb_transactions: withScore.length, transactions: withScore };

    if (format === 'html') {
      const html = generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche, prixBienNum, nbTransactionsSection);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
