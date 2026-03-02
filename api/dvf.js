// ===============================
// Utils
// ===============================

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ===============================
// Scoring Engine (amélioré)
// ===============================

function scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche, prixMedianSection) {

  const distanceM = distanceKm * 1000;

  // 1️⃣ Distance (0-40) — décroissance exponentielle
  const scoreDistance = 40 * Math.exp(-distanceM / 300);

  // 2️⃣ Surface (0-25)
  let scoreSurface = 25;
  if (surfaceRecherche && t.surface) {
    const ecart = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 25 - ecart * 50);
  }

  // 3️⃣ Pièces (0-20)
  let scorePieces = 20;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecart = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 20 - ecart * 8);
  }

  // 4️⃣ Décote vs médiane section (0-15)
  let scoreDecote = 0;
  if (prixMedianSection && t.prix_m2) {
    const decote = (prixMedianSection - t.prix_m2) / prixMedianSection;
    if (decote > 0) {
      scoreDecote = Math.min(15, decote * 60);
    }
  }

  return Math.round(scoreDistance + scoreSurface + scorePieces + scoreDecote);
}


// ===============================
// API Handler
// ===============================

export default async function handler(req, res) {

  const { adresse, type_bien, surface, nb_pieces, format } = req.query;

  if (!adresse) {
    return res.status(400).json({ error: "adresse manquante" });
  }

  try {

    // ===============================
    // 1️⃣ Geocodage
    // ===============================

    const geoRes = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`
    );

    const geoData = await geoRes.json();

    if (!geoData.features || geoData.features.length === 0) {
      return res.status(404).json({ error: "Adresse non trouvée" });
    }

    const feature = geoData.features[0];

    if (feature.properties.score < 0.7) {
      return res.status(400).json({ error: "Adresse non reconnue" });
    }

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];

    const adresse_normalisee = feature.properties.label;
    const ville = feature.properties.city;
    const code_postal = feature.properties.postcode?.trim() || "";

    const surfaceRecherche = surface ? parseFloat(surface) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;

    // ===============================
    // 2️⃣ Bounding Box (≈700m)
    // ===============================

    const deltaLat = 0.007;  // ~700m
    const deltaLon = 0.01;   // ~700m (approx France)

    const minLat = lat - deltaLat;
    const maxLat = lat + deltaLat;
    const minLon = lon - deltaLon;
    const maxLon = lon + deltaLon;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    let url = `${SUPABASE_URL}/rest/v1/transactions?` +
      `latitude=gte.${minLat}&latitude=lte.${maxLat}` +
      `&longitude=gte.${minLon}&longitude=lte.${maxLon}` +
      `&select=date_mutation,adresse,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,section_cadastrale,latitude,longitude`;

    if (type_bien) {
      url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;
    }

    const supaRes = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });

    const transactions = await supaRes.json();

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: "Aucune transaction trouvée dans la zone" });
    }

    // ===============================
    // 3️⃣ Filtre distance + scoring
    // ===============================

    const enriched = transactions
      .map(t => {
        const distanceKm = haversine(lat, lon, t.latitude, t.longitude);
        const distanceM = Math.round(distanceKm * 1000);

        return {
          ...t,
          distance_km: distanceKm,
          distance_m: distanceM
        };
      })
      .filter(t => t.distance_m <= 500);

    if (enriched.length === 0) {
      return res.status(404).json({ error: "Aucune transaction dans un rayon de 500m" });
    }

    const prixMedianSection = enriched[0].prix_median_section || 0;

    const withScore = enriched
      .map(t => ({
        ...t,
        score: scoreTransaction(
          t,
          t.distance_km,
          surfaceRecherche,
          nbPiecesRecherche,
          prixMedianSection
        )
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    // ===============================
    // 4️⃣ Réponse
    // ===============================

    const responseData = {
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      prix_median_m2: prixMedianSection,
      nb_transactions: withScore.length,
      transactions: withScore
    };

    if (format === "html") {
      const html = generateHTML(responseData, lat, lon, surfaceRecherche, nbPiecesRecherche);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
