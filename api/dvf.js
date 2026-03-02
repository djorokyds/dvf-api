// Calcul distance Haversine en km
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

function generateHTML(data) {
  const { adresse_normalisee, ville, code_postal, section_cadastrale, prix_median_m2, transactions } = data;
  
  const rows = transactions.map(t => `
    <tr>
      <td>${t.type_bien}</td>
      <td>${t.surface} m²</td>
      <td>${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €</td>
      <td>${t.prix_m2} €/m²</td>
      <td>${t.nb_pieces || '-'}</td>
      <td>${t.distance_km < 1 ? Math.round(t.distance_km * 1000) + ' m' : t.distance_km.toFixed(1) + ' km'}</td>
      <td>${t.date_mutation}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimation DVF - ${ville}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    .header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 24px 20px; }
    .header h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.8; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
    .card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card .value { font-size: 22px; font-weight: 700; color: #2c3e50; }
    .card .unit { font-size: 12px; color: #888; margin-top: 2px; }
    .card.highlight { background: linear-gradient(135deg, #3498db, #2980b9); color: white; grid-column: 1 / -1; }
    .card.highlight .label { color: rgba(255,255,255,0.7); }
    .card.highlight .value { color: white; font-size: 32px; }
    .card.highlight .unit { color: rgba(255,255,255,0.7); }
    .section-title { padding: 0 16px 8px; font-size: 14px; font-weight: 600; color: #555; }
    .table-wrap { padding: 0 16px 16px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 13px; }
    th { background: #f8f9fa; padding: 10px 12px; text-align: left; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8f9ff; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .badge.maison { background: #e8f5e9; color: #2e7d32; }
    .badge.appart { background: #e3f2fd; color: #1565c0; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📍 ${adresse_normalisee}</h1>
    <p>${ville} • ${code_postal} • Section ${section_cadastrale || 'N/A'}</p>
  </div>

  <div class="cards">
    <div class="card highlight">
      <div class="label">Prix médian au m²</div>
      <div class="value">${prix_median_m2.toLocaleString('fr-FR')} €</div>
      <div class="unit">Section ${section_cadastrale || code_postal} • Données DVF 2024</div>
    </div>
    <div class="card">
      <div class="label">Transactions</div>
      <div class="value">${transactions.length}</div>
      <div class="unit">dans la zone</div>
    </div>
    <div class="card">
      <div class="label">Zone</div>
      <div class="value" style="font-size:16px">${ville}</div>
      <div class="unit">${code_postal}</div>
    </div>
  </div>

  <div class="section-title">🏠 Transactions les plus proches</div>
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
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  <div class="footer">Source : Demandes de Valeurs Foncières (DVF) • Données officielles</div>
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

    // Étape 2 : Récupérer transactions Supabase
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

    // Étape 3 : Calcul distance Haversine
    const withDistance = transactions
      .filter(t => t.latitude && t.longitude)
      .map(t => ({
        ...t,
        distance_km: haversine(lat, lon, t.latitude, t.longitude)
      }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 10);

    const prix_median = withDistance.length > 0 ? withDistance[0].prix_median_section || 0 : 0;
    const section_cadastrale = withDistance.length > 0 ? withDistance[0].section_cadastrale : null;

    const responseData = {
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      prix_median_m2: prix_median,
      nb_transactions: withDistance.length,
      transactions: withDistance
    };

    // Retourner HTML ou JSON
    if (format === 'html') {
      const html = generateHTML(responseData);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
