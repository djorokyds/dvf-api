export default async function handler(req, res) {
  const { adresse } = req.query;
  
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
      return res.status(400).json({ 
        error: "Adresse non reconnue, veuillez vérifier",
        score 
      });
    }

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode;
    const code_insee = feature.properties.citycode;
    const ville = feature.properties.city;
    const adresse_normalisee = feature.properties.label;

    // Étape 2 : Trouver la section cadastrale via coordonnées GPS
    const cadastreRes = await fetch(
      `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lon}&lat=${lat}&_limit=1`
    );
    const cadastreData = await cadastreRes.json();
    
    let section_cadastrale = null;
    let cle_section = null;

    if (cadastreData.features && cadastreData.features.length > 0) {
      section_cadastrale = cadastreData.features[0].properties.section;
      cle_section = `${code_postal}-${section_cadastrale}`;
    }

    // Étape 3 : Interroger Supabase
    let transactions = [];
    let prix_median = 0;
    let query_url = '';

    if (cle_section) {
      // Recherche par section cadastrale précise
      query_url = `${SUPABASE_URL}/rest/v1/transactions?cle_section=eq.${cle_section}&order=date_mutation.desc&limit=10&select=date_mutation,adresse,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section`;
    } else {
      // Fallback : recherche par code postal
      query_url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&order=date_mutation.desc&limit=10&select=date_mutation,adresse,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section`;
    }

    const supaRes = await fetch(query_url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    transactions = await supaRes.json();

    if (transactions.length > 0) {
      prix_median = transactions[0].prix_median_section || 0;
    }

    // Étape 4 : Construire le résumé des transactions
    const transactions_resume = transactions.map(t => 
      `• ${t.type_bien} ${t.surface}m² - ${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')}€ - ${t.prix_m2}€/m² (${t.date_mutation})`
    ).join('\n');

    return res.status(200).json({
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      section_cadastrale,
      cle_section,
      score,
      prix_median_m2: prix_median,
      nb_transactions: transactions.length,
      transactions_resume,
      transactions
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
