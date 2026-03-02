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

function percentile(arr, p) {
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}


// ===============================
// Scoring Engine (inchangé)
// ===============================

function scoreTransaction(t, distanceKm, surfaceRecherche, nbPiecesRecherche, prixMedianSection) {

  const distanceM = distanceKm * 1000;
  const scoreDistance = 40 * Math.exp(-distanceM / 300);

  let scoreSurface = 25;
  if (surfaceRecherche && t.surface) {
    const ecart = Math.abs(t.surface - surfaceRecherche) / surfaceRecherche;
    scoreSurface = Math.max(0, 25 - ecart * 50);
  }

  let scorePieces = 20;
  if (nbPiecesRecherche && t.nb_pieces) {
    const ecart = Math.abs(t.nb_pieces - nbPiecesRecherche);
    scorePieces = Math.max(0, 20 - ecart * 8);
  }

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
// API Handler amélioré
// ===============================

export default async function handler(req, res) {

  const { adresse, type_bien, surface, nb_pieces, prix, format } = req.query;

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
      return res.status(400).json({ error: "Adresse imprécise" });
    }

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];

    const adresse_normalisee = feature.properties.label;
    const ville = feature.properties.city;
    const code_postal = feature.properties.postcode?.trim() || "";

    const surfaceRecherche = surface ? parseFloat(surface) : null;
    const nbPiecesRecherche = nb_pieces ? parseInt(nb_pieces) : null;
    const prixBien = prix ? parseFloat(prix) : null;

    // ===============================
    // 2️⃣ Bounding box
    // ===============================

    const deltaLat = 0.007;
    const deltaLon = 0.01;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    let url = `${SUPABASE_URL}/rest/v1/transactions?` +
      `latitude=gte.${lat - deltaLat}&latitude=lte.${lat + deltaLat}` +
      `&longitude=gte.${lon - deltaLon}&longitude=lte.${lon + deltaLon}` +
      `&select=date_mutation,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,latitude,longitude`;

    if (type_bien) {
      url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;
    }

    const supaRes = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    const transactions = await supaRes.json();

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: "Aucune transaction trouvée" });
    }

    // ===============================
    // 3️⃣ Filtre 500m
    // ===============================

    const filtered = transactions
      .map(t => {
        const distanceKm = haversine(lat, lon, t.latitude, t.longitude);
        return {
          ...t,
          distance_m: Math.round(distanceKm * 1000),
          distance_km: distanceKm
        };
      })
      .filter(t => t.distance_m <= 500 && t.prix_m2);

    if (filtered.length === 0) {
      return res.status(404).json({ error: "Aucune transaction dans un rayon de 500m" });
    }

    // ===============================
    // 4️⃣ Analyse Marché Globale
    // ===============================

    const prixM2List = filtered.map(t => t.prix_m2).sort((a,b)=>a-b);

    const median = percentile(prixM2List, 50);
    const p25 = percentile(prixM2List, 25);
    const p75 = percentile(prixM2List, 75);

    const mean = prixM2List.reduce((a,b)=>a+b,0) / prixM2List.length;
    const variance = prixM2List.reduce((s,v)=>s+Math.pow(v-mean,2),0)/prixM2List.length;
    const ecartType = Math.sqrt(variance);
    const dispersionPct = (ecartType/mean)*100;

    // Fiabilité
    let fiabilite;
    if (filtered.length >= 20) fiabilite = "Analyse fiable";
    else if (filtered.length >= 8) fiabilite = "Analyse solide";
    else fiabilite = "Analyse indicative";

    // Tension marché (12 mois)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);

    const ventes12mois = filtered.filter(t =>
      new Date(t.date_mutation) > oneYearAgo
    ).length;

    let tension;
    if (ventes12mois > 15) tension = "Marché dynamique";
    else if (ventes12mois > 7) tension = "Marché équilibré";
    else tension = "Marché calme";

    // ===============================
    // 5️⃣ Analyse bien utilisateur
    // ===============================

    let analyseBien = null;

    if (prixBien && surfaceRecherche) {
      const prixM2Bien = prixBien / surfaceRecherche;
      const ecartPct = ((prixM2Bien - median)/median)*100;

      let verdict;
      if (ecartPct <= -8) verdict = "Bonne affaire";
      else if (ecartPct <= 5) verdict = "Prix cohérent";
      else if (ecartPct <= 12) verdict = "Légèrement cher";
      else verdict = "Surévalué";

      analyseBien = {
        prix_bien_m2: Math.round(prixM2Bien),
        ecart_pct: Math.round(ecartPct*10)/10,
        verdict,
        prix_recommande: Math.round(median*surfaceRecherche),
        fourchette_basse: Math.round(p25*surfaceRecherche),
        fourchette_haute: Math.round(p75*surfaceRecherche)
      };
    }

    // ===============================
    // 6️⃣ Scoring comparables
    // ===============================

    const prixMedianSection = median;

    const comparables = filtered
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
      .sort((a,b)=>b.score-a.score)
      .slice(0,15);

    // ===============================
    // 7️⃣ Réponse finale
    // ===============================

    return res.status(200).json({
      success: true,
      adresse_normalisee,
      ville,
      code_postal,
      marche: {
        median_m2: Math.round(median),
        dispersion: dispersionPct < 8 ? "Marché homogène" : "Marché hétérogène",
        fiabilite,
        tension
      },
      analyse_bien: analyseBien,
      comparables,
      nb_transactions: filtered.length
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
