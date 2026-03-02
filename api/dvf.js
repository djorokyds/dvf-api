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

export default async function handler(req, res) {
  const { adresse, type_bien } = req.query;
  
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

    // Étape 4 : Prix médian section la plus proche
    const prix_median = withDistance.length > 0 ? withDistance[0].prix_median_section || 0 : 0;
    const section_cadastrale = withDistance.length > 0 ? withDistance[0].section_cadastrale : null;
    const cle_section_type = withDistance.length > 0 ? withDistance[0].cle_section_type : null;

    // Étape 5 : Résumé transactions
    const transactions_resume = withDistance.map(t => 
      `• ${t.type_bien} ${t.surface}m² - ${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')}€ - ${t.prix_m2}€/m² - ${t.distance_km < 1 ? Math.round(t.distance_km * 1000) + 'm' : t.distance_km.toFixed(1) + 'km'} (${t.date_mutation})`
    ).join('\n');

    return res.status(200).json({
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      cle_section_type,
      prix_median_m2: prix_median,
      nb_transactions: withDistance.length,
      transactions_resume,
      transactions: withDistance
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
