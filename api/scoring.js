function calculScoreOpportunite(tri, coc, cashflow9, ecartPrix, nbTransactionsSection) {
  const triNegatif = tri < 0;
  const scoreCoc = Math.min(20, Math.round((Math.max(0, coc) / 10) * 20));
  const scoreTri = tri < 0 ? -15 : Math.min(18, Math.round((tri / 15) * 18));

  let scoreCashflow = 0;
  if (cashflow9 > 50000) scoreCashflow = 12;
  else if (cashflow9 > 30000) scoreCashflow = 10;
  else if (cashflow9 > 15000) scoreCashflow = 7;
  else if (cashflow9 > 5000) scoreCashflow = 4;
  else scoreCashflow = 0;

  const scoreRentabilite = scoreCoc + scoreTri + scoreCashflow;

  let scorePrix = 0;
  if (ecartPrix <= -20) scorePrix = 35;
  else if (ecartPrix <= 0) scorePrix = 30;
  else if (ecartPrix <= 20) scorePrix = Math.round(30 - (ecartPrix / 20) * 24);
  else scorePrix = Math.max(0, Math.round(6 - ((ecartPrix - 20) / 10) * 6));

  let scoreTension = 0;
  if (nbTransactionsSection < 10) scoreTension = 20;
  else if (nbTransactionsSection <= 20) scoreTension = 12;
  else scoreTension = 5;

  let total = Math.min(100, Math.max(0, scoreRentabilite + scorePrix + scoreTension));
  if (triNegatif) total = Math.min(40, total);
  if (cashflow9 <= 0) total = Math.min(50, total);

  return { total, details: { rentabilite: Math.max(0, scoreRentabilite), prix: scorePrix, tension: scoreTension } };
}

function generateHTML(params) {
  const { scoring } = params;
  const { total } = scoring;

  let scoreEmoji, scoreLabel, scoreDesc;
  if (total >= 70) {
    scoreEmoji = '🟢'; scoreLabel = 'Bonne opportunité';
    scoreDesc = 'Ce projet présente de solides indicateurs financiers et de marché.';
  } else if (total >= 40) {
    scoreEmoji = '🟡'; scoreLabel = 'Projet acceptable';
    scoreDesc = 'Ce projet est viable mais certains indicateurs méritent attention.';
  } else {
    scoreEmoji = '🔴'; scoreLabel = 'Projet risqué';
    scoreDesc = 'Ce projet présente des signaux faibles — à analyser en détail.';
  }

  const pct = total;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Score Opportunité - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a1a;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 32px 28px;
      width: 100%;
      max-width: 400px;
    }
    .score-number {
      font-size: 72px;
      font-weight: 800;
      color: #eaeaea;
      line-height: 1;
      margin-bottom: 6px;
    }
    .score-number span { font-size: 22px; color: #555; }

    .gauge-container {
      position: relative;
      margin: 40px 0 16px;
      padding: 0 4px;
    }

    /* Triangle indicator above track */
    .gauge-triangle-wrap {
      position: absolute;
      top: -26px;
      left: 0%;
      transform: translateX(-50%);
      transition: left 1.4s cubic-bezier(0.34, 1.05, 0.64, 1);
    }
    .gauge-triangle-wrap.animated {
      left: ${pct}%;
    }
    .gauge-triangle {
      width: 0;
      height: 0;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 16px solid white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    /* Track */
    .gauge-track {
      position: relative;
      height: 16px;
      border-radius: 8px;
      background: linear-gradient(to right, #e05565 0%, #f0b429 50%, #3dbf8a 100%);
      box-shadow: 0 0 14px rgba(255,255,255,0.06);
    }

    /* Séparateurs de zones */
    .gauge-sep {
      position: absolute;
      top: 0; bottom: 0;
      width: 2px;
      background: rgba(0,0,0,0.3);
      border-radius: 1px;
    }

    /* Labels */
    .gauge-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 10px;
      color: #444;
    }
    .zone-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      padding: 0 2px;
      font-size: 10px;
    }
    .zone-label.red   { color: #e05565; }
    .zone-label.yellow { color: #f0b429; text-align: center; flex: 1; }
    .zone-label.green  { color: #3dbf8a; text-align: right; }

    .score-label {
      font-size: 18px;
      font-weight: 700;
      margin: 20px 0 8px;
      color: #eaeaea;
    }
    .score-desc {
      font-size: 12px;
      color: #777;
      line-height: 1.6;
      max-width: 300px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="score-number">${total}<span>/100</span></div>

    <div class="gauge-container">

      <!-- Triangle au dessus -->
      <div class="gauge-triangle-wrap" id="triangle">
        <div class="gauge-triangle"></div>
      </div>

      <!-- Barre -->
      <div class="gauge-track">
        <div class="gauge-sep" style="left: 40%"></div>
        <div class="gauge-sep" style="left: 70%"></div>
      </div>

      <!-- Chiffres -->
      <div class="gauge-labels">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      <!-- Zones -->
      <div class="zone-labels">
        <span class="zone-label red">Risqué</span>
        <span class="zone-label yellow">Acceptable</span>
        <span class="zone-label green">Opportunité</span>
      </div>

    </div>

    <div class="score-label">${scoreEmoji} ${scoreLabel}</div>
    <div class="score-desc">${scoreDesc}</div>

  </div>

  <script>
    setTimeout(() => {
      document.getElementById('triangle').classList.add('animated');
    }, 300);
  </script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const { adresse, type_bien, surface, prix_bien, tri, coc, cashflow_9, format } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });
  if (!tri || !coc || !cashflow_9) return res.status(400).json({ error: "Paramètres scoring manquants (tri, coc, cashflow_9)" });

  try {
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features || geoData.features.length === 0) return res.status(404).json({ error: "Adresse non trouvée" });

    const feature = geoData.features[0];
    if (feature.properties.score < 0.7) return res.status(400).json({ error: "Adresse non reconnue" });

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';
    const adresse_normalisee = feature.properties.label;

    const surfaceRecherche = surface ? parseFloat(surface.replace(/\s/g, '')) : null;
    const prixBienNum = prix_bien ? parseFloat(prix_bien.replace(/\s/g, '').replace(',', '.')) : null;
    const triNum = parseFloat(tri);
    const cocNum = parseFloat(coc);
    const cashflow9Num = parseFloat(cashflow_9.replace(/\s/g, '').replace(',', '.'));

    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
        Math.sin(dLon/2)*Math.sin(dLon/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=prix_median_section,section_cadastrale,cle_section,latitude,longitude&latitude=not.is.null&order=date_mutation.desc.nullslast&limit=1000`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' }
    });
    const transactions = await supaRes.json();

    let prix_median_m2 = 0;
    let section_cadastrale = null;
    let nbTransactionsSection = 0;

    if (Array.isArray(transactions) && transactions.length > 0) {
      const withDistance = transactions
        .filter(t => t.latitude != null && t.longitude != null)
        .map(t => ({ ...t, distance_m: Math.round(haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude)) * 1000) }))
        .filter(t => t.distance_m <= 1000)
        .sort((a, b) => a.distance_m - b.distance_m);

      const closest = withDistance[0];
      if (closest) {
        prix_median_m2 = closest.prix_median_section || 0;
        section_cadastrale = closest.section_cadastrale;
        const sectionPrincipale = closest.cle_section;
        nbTransactionsSection = sectionPrincipale
          ? transactions.filter(t => t.cle_section === sectionPrincipale).length
          : transactions.length;
      }
    }

    const prixM2Bien = (prixBienNum && surfaceRecherche) ? prixBienNum / surfaceRecherche : null;
    const ecartPrix = (prixM2Bien && prix_median_m2) ? ((prixM2Bien - prix_median_m2) / prix_median_m2 * 100) : 0;

    const scoring = calculScoreOpportunite(triNum, cocNum, cashflow9Num, ecartPrix, nbTransactionsSection);

    const params = {
      adresse_normalisee, section_cadastrale, prix_median_m2,
      tri: triNum, coc: cocNum, cashflow_9: cashflow9Num,
      prixBien: prixBienNum, surfaceRecherche, nbTransactionsSection, scoring
    };

    if (format === 'html') {
      const html = generateHTML(params);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({ success: true, ...params });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
