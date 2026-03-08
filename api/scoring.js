function calculScoreOpportunite(bscore, tri, coc, payback, ecartPrix, nbTransactionsSection) {
  const scoreProfit = Math.min(25, Math.round((bscore / 100) * 25));

  const scoreCoc = Math.min(15, Math.round((Math.max(0, coc) / 6) * 15));
  const scoreTri = Math.min(12, Math.round((Math.max(0, tri) / 10) * 12));
  const scorePayback = payback < 10 ? 8 : payback <= 15 ? 4 : 0;
  const scoreRentabilite = scoreCoc + scoreTri + scorePayback;

  let scorePrix = 0;
  if (ecartPrix <= 0) scorePrix = 25;
  else if (ecartPrix <= 20) scorePrix = Math.round(25 - (ecartPrix / 20) * 20);
  else scorePrix = Math.max(0, Math.round(5 - ((ecartPrix - 20) / 10) * 5));

  let scoreTension = 0;
  if (nbTransactionsSection < 10) scoreTension = 15;
  else if (nbTransactionsSection <= 20) scoreTension = 10;
  else scoreTension = 5;

  const total = Math.min(100, scoreProfit + scoreRentabilite + scorePrix + scoreTension);
  return { total, details: { profil: scoreProfit, rentabilite: scoreRentabilite, prix: scorePrix, tension: scoreTension } };
}

function generateHTML(params) {
  const { adresse_normalisee, section_cadastrale, scoring } = params;
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

  // Calcul angle aiguille : -90deg (gauche) à +90deg (droite)
  const angle = -90 + (total / 100) * 180;

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
      background: #1f1f1f;
      color: #eaeaea;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 24px;
      width: 100%;
      max-width: 340px;
    }
    .gauge-wrap {
      position: relative;
      width: 280px;
      height: 150px;
      margin: 0 auto 8px;
    }
    .gauge-svg {
      width: 280px;
      height: 150px;
    }
    .needle {
      transform-origin: 140px 140px;
      transform: rotate(${angle}deg);
      transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .score-center {
      position: absolute;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    }
    .score-number {
      font-size: 48px;
      font-weight: 800;
      line-height: 1;
      background: linear-gradient(90deg, #e74c3c, #f39c12, #27ae60);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .score-max { font-size: 13px; color: #888; margin-top: 2px; }
    .score-label {
      font-size: 17px;
      font-weight: 700;
      margin: 12px 0 8px;
    }
    .score-desc {
      font-size: 12px;
      color: #888;
      line-height: 1.6;
      max-width: 260px;
      margin: 0 auto;
    }
    .gauge-labels {
      display: flex;
      justify-content: space-between;
      width: 280px;
      margin: 0 auto 4px;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 280 150">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#e74c3c"/>
            <stop offset="50%"  stop-color="#f39c12"/>
            <stop offset="100%" stop-color="#27ae60"/>
          </linearGradient>
          <linearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#888888"/>
          </linearGradient>
        </defs>

        <!-- Arc de fond -->
        <path
          d="M 20 140 A 120 120 0 0 1 260 140"
          fill="none"
          stroke="#2a2a2a"
          stroke-width="22"
          stroke-linecap="round"
        />

        <!-- Arc coloré dégradé -->
        <path
          d="M 20 140 A 120 120 0 0 1 260 140"
          fill="none"
          stroke="url(#gaugeGrad)"
          stroke-width="18"
          stroke-linecap="round"
          opacity="0.85"
        />

        <!-- Tirets de graduation -->
        ${[0, 25, 50, 75, 100].map(v => {
          const a = (-180 + (v / 100) * 180) * Math.PI / 180;
          const r1 = 108, r2 = 122;
          const cx = 140, cy = 140;
          const x1 = cx + r1 * Math.cos(a);
          const y1 = cy + r1 * Math.sin(a);
          const x2 = cx + r2 * Math.cos(a);
          const y2 = cy + r2 * Math.sin(a);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1f1f1f" stroke-width="2"/>`;
        }).join('')}

        <!-- Aiguille -->
        <g class="needle">
          <polygon
            points="140,145 136,145 138,30 142,30"
            fill="url(#needleGrad)"
            opacity="0.95"
          />
          <circle cx="140" cy="140" r="8" fill="#eaeaea" stroke="#888" stroke-width="1.5"/>
          <circle cx="140" cy="140" r="3" fill="#1f1f1f"/>
        </g>
      </svg>

      <div class="score-center">
        <div class="score-number">${total}</div>
        <div class="score-max">/100</div>
      </div>
    </div>

    <div class="gauge-labels">
      <span>0</span>
      <span>25</span>
      <span>50</span>
      <span>75</span>
      <span>100</span>
    </div>

    <div class="score-label">${scoreEmoji} ${scoreLabel}</div>
    <div class="score-desc">${scoreDesc}</div>

  </div>

  <script>
    // Animation aiguille au chargement
    const needle = document.querySelector('.needle');
    needle.style.transform = 'rotate(-90deg)';
    setTimeout(() => {
      needle.style.transform = 'rotate(${angle}deg)';
    }, 300);
  </script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const { adresse, type_bien, surface, prix_bien, bscore, tri, coc, payback, format } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });
  if (!bscore || !tri || !coc || !payback) return res.status(400).json({ error: "Paramètres scoring manquants" });

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
    const bscoreNum = parseFloat(bscore);
    const triNum = parseFloat(tri);
    const cocNum = parseFloat(coc);
    const paybackNum = parseFloat(payback);

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

    const scoring = calculScoreOpportunite(bscoreNum, triNum, cocNum, paybackNum, ecartPrix, nbTransactionsSection);

    const params = {
      adresse_normalisee, section_cadastrale, prix_median_m2,
      bscore: bscoreNum, tri: triNum, coc: cocNum, payback: paybackNum,
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
