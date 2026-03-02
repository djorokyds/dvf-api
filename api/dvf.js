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
  const { adresse } = req.query;
  
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    // Géocoder l'adresse
    const geoRes = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`
    );
    const geoData = await geoRes.json();
    const feature = geoData.features[0];
    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';

    // Récupérer transactions
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=adresse,latitude,longitude&limit=10`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const transactions = await supaRes.json();

    // Calculer distances
    const sample = transactions.map(t => ({
      adresse: t.adresse,
      lat_raw: t.latitude,
      lon_raw: t.longitude,
      lat_type: typeof t.latitude,
      lat_parsed: parseFloat(t.latitude),
      lon_parsed: parseFloat(t.longitude),
      distance_m: Math.round(haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude)) * 1000)
    }));

    return res.status(200).json({
      user_lat: lat,
      user_lon: lon,
      code_postal,
      nb_transactions: transactions.length,
      sample
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
