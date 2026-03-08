function calculScoreOpportunite(bscore, tri, coc, payback, ecartPrix, nbTransactionsSection) {
  // 1. Profil financier (25pts) — B-Score normalisé
  const scoreProfit = Math.min(25, Math.round((bscore / 100) * 25));

  // 2. Rentabilité (35pts)
  // CoC Return : 0-6% → 0-15pts
  const scoreCoc = Math.min(15, Math.round((Math.max(0, coc) / 6) * 15));
  // TRI 10ans : 0-10% → 0-12pts
  const scoreTri = Math.min(12, Math.round((Math.max(0, tri) / 10) * 12));
  // Payback : >15ans=0 / 10-15=4 / <10ans=8pts
  const scorePayback = payback < 10 ? 8 : payback <= 15 ? 4 : 0;
  const scoreRentabilite = scoreCoc + scoreTri + scorePayback;

  // 3. Prix marché (25pts)
  let scorePrix = 0;
  if (ecartPrix <= 0) scorePrix = 25;
  else if (ecartPrix <= 20) scorePrix = Math.round(25 - (ecartPrix / 20) * 20);
  else scorePrix = Math.max(0, Math.round(5 - ((ecartPrix - 20) / 10) * 5));

  // 4. Tension marché (15pts)
  let scoreTension = 0;
  if (nbTransactionsSection < 10) scoreTension = 15;
  else if (nbTransactionsSection <= 20) scoreTension = 10;
  else scoreTension = 5;

  const total = scoreProfit + scoreRentabilite + scorePrix + scoreTension;

  return {
    total: Math.min(100, total),
    details: {
      profil: scoreProfit,
      rentabilite: scoreRentabilite,
      prix: scorePrix,
      tension: scoreTension
    }
  };
}

function generateHTML(params) {
  const { adresse_normalisee, section_cadastrale, ville, code_postal, prix_median_m2, bscore, tri, coc, payback, prixBien, surfaceRecherche, nbTransactionsSection, scoring } = params;

  const { total, details } = scoring;

  let scoreColor, scoreEmoji, scoreLabel, scoreDesc;
  if (total >= 70) {
    scoreColor = '#27ae60'; scoreEmoji = '🟢'; scoreLabel = 'Bonne opportunité';
    scoreDesc = 'Ce projet présente de solides indicateurs financiers et de marché.';
  } else if (total >= 40) {
    scoreColor = '#f39c12'; scoreEmoji = '🟡'; scoreLabel = 'Projet acceptable';
    scoreDesc = 'Ce projet est viable mais certains indicateurs méritent attention.';
  } else {
    scoreColor = '#e74c3c'; scoreEmoji = '🔴'; scoreLabel = 'Projet risqué';
    scoreDesc = 'Ce projet présente des signaux faibles — à analyser en détail.';
  }

  const prixM2Bien = (prixBien && surfaceRecherche) ? Math.round(prixBien / surfaceRecherche) : null;
  const ecartPct = (prixM2Bien && prix_median_m2) ? ((prixM2Bien - prix_median_m2) / prix_median_m2 * 100) : null;

  const dimensions = [
    { label: 'Profil financier', key: 'profil', max: 25, value: details.profil, desc: `B-Score : ${bscore}/100` },
    { label: 'Rentabilité', key: 'rentabilite', max: 35, value: details.rentabilite, desc: `CoC ${coc}% • TRI ${tri}% • Payback ${payback} ans` },
    { label: 'Prix de marché', key: 'prix', max: 25, value: details.prix, desc: ecartPct !== null ? `${ecartPct > 0 ? '+' : ''}${ecartPct.toFixed(1)}% vs médiane DVF` : 'Non renseigné' },
    { label: 'Tension marché', key: 'tension', max: 15, value: details.tension, desc: `${nbTransactionsSection} ventes dans la section` }
  ];

  const dimensionRows = dimensions.map(d => {
    const pct = Math.round((d.value / d.max) * 100);
    const color = pct >= 70 ? '#27ae60' : pct >= 40 ? '#f39c12' : '#e74c3c';
    return `
      <div class="dim-row">
        <div class="dim-header">
          <span class="dim-label">${d.label}</span>
          <span class="dim-score" style="color:${color}">${d.value}/${d.max}</span>
        </div>
        <div class="dim-bar-bg">
          <div class="dim-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="dim-desc">${d.desc}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Score Opportunité - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1f1f1f; color: #eaeaea; }
    .header { background: linear-gradient(135deg, #1f1f1f, #1f1f1f); color: white; padding: 20px 16px; }
    .header h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.8; }

    .score-main { margin: 14px; background: #1f1f1f; border-radius: 16px; border: 1px solid #888; padding: 24px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; flex-direction: column; border: 6px solid ${scoreColor}; box-shadow: 0 0 24px ${scoreColor}40; }
    .score-number { font-size: 42px; font-weight: 800; color: ${scoreColor}; line-height: 1; }
    .score-max { font-size: 13px; color: #888; }
    .score-label { font-size: 18px; font-weight: 700; color: ${scoreColor}; margin-bottom: 8px; }
    .score-desc { font-size: 12px; color: #888; line-height: 1.5; }

    .dims { margin: 0 14px 14px; background: #1f1f1f; border-radius: 12px; border: 1px solid #888; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .dims-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .dim-row { margin-bottom: 14px; }
    .dim-row:last-child { margin-bottom: 0; }
    .dim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
    .dim-label { font-size: 13px; font-weight: 600; color: #eaeaea; }
    .dim-score { font-size: 13px; font-weight: 700; }
    .dim-bar-bg { background: #2a2a2a; border-radius: 20px; height: 8px; overflow: hidden; margin-bottom: 4px; }
    .dim-bar-fill { height: 100%; border-radius: 20px; transition: width 0.6s ease; }
    .dim-desc { font-size: 10px; color: #888; }

    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 14px 14px; }
    .card { background: #1f1f1f; border-radius: 12px; border: 1px solid #888; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; color: white; }
    .card .unit { font-size: 11px; color: #888; margin-top: 2px; }

    .ecart-box { margin: 0 14px 14px; background: #1f1f1f; border-radius: 12px; border: 1px solid #888; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid ${ecartPct !== null ? (ecartPct < 0 ? '#27ae60' : '#e74c3c') : '#888'}; }
    .ecart-label { font-size: 11px; color: #888; margin-bottom: 4px; }
    .ecart-value { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: ${ecartPct !== null ? (ecartPct < 0 ? '#27ae60' : '#e74c3c') : '#888'}; }
    .ecart-detail { font-size: 11px; color: #888; }

    .footer { text-align: center; padding: 14px; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Score d'Opportunité</h1>
    <p>${adresse_normalisee} • Section ${section_cadastrale || 'N/A'}</p>
  </div>

  <div class="score-main">
    <div class="score-circle">
      <div class="score-number">${total}</div>
      <div class="score-max">/100</div>
    </div>
    <div class="score-label">${scoreEmoji} ${scoreLabel}</div>
    <div class="score-desc">${scoreDesc}</div>
  </div>

  <div class="dims">
    <div class="dims-title">Détail du scoring</div>
    ${dimensionRows}
  </div>

  <div class="cards">
    <div class="card">
      <div class="label">CoC Return</div>
      <div class="value">${coc} %</div>
      <div class="unit">Cash on Cash</div>
    </div>
    <div class="card">
      <div class="label">TRI 10 ans</div>
      <div class="value">${tri} %</div>
      <div class="unit">Taux de rendement interne</div>
    </div>
    <div class="card">
      <div class="label">Payback</div>
      <div class="value">${payback} ans</div>
      <div class="unit">Retour sur investissement</div>
    </div>
    <div class="card">
      <div class="label">B-Score</div>
      <div class="value">${bscore}/100</div>
      <div class="unit">Solidité financière</div>
    </div>
  </div>

  ${ecartPct !== null ? `
  <div class="ecart-box">
    <div class="ecart-label">Écart vs marché DVF</div>
    <div class="ecart-value">${ecartPct > 0 ? '+' : ''}${ecartPct.toFixed(1)}% ${ecartPct < 0 ? '🟢 sous le marché' : '🔴 au-dessus du marché'}</div>
    <div class="ecart-detail">Votre bien : ${prixM2Bien.toLocaleString('fr-FR')} €/m² vs médiane : ${prix_median_m2.toLocaleString('fr-FR')} €/m²</div>
  </div>
  ` : ''}

  <div class="footer">Score calculé sur 100 pts • Profil (25) + Rentabilité (35) + Prix marché (25) + Tension (15) • Fi-One</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const {
    adresse,
    type_bien,
    surface,
    prix_bien,
    bscore,
    tri,
    coc,
    payback,
    format
  } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!adresse) return res.status(400).json({ error: "adresse manquante" });
  if (!bscore || !tri || !coc || !payback) return res.status(400).json({ error: "Paramètres scoring manquants (bscore, tri, coc, payback)" });

  try {
    // Géocodage
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features || geoData.features.length === 0) return res.status(404).json({ error: "Adresse non trouvée" });

    const feature = geoData.features[0];
    if (feature.properties.score < 0.7) return res.status(400).json({ error: "Adresse non reconnue" });

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const code_postal = feature.properties.postcode?.trim() || '';
    const ville = feature.properties.city;
    const adresse_normalisee = feature.properties.label;

    const surfaceRecherche = surface ? parseFloat(surface.replace(/\s/g, '')) : null;
    const prixBienNum = prix_bien ? parseFloat(prix_bien.replace(/\s/g, '').replace(',', '.')) : null;
    const bscoreNum = parseFloat(bscore);
    const triNum = parseFloat(tri);
    const cocNum = parseFloat(coc);
    const paybackNum = parseFloat(payback);

    // Supabase — transactions pour prix médian + section
    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=date_mutation,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,section_cadastrale,cle_section,latitude,longitude&latitude=not.is.null&order=date_mutation.desc.nullslast&limit=1000`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const supaRes = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' }
    });
    const transactions = await supaRes.json();
    if (!Array.isArray(transactions) || transactions.length === 0) return res.status(404).json({ error: "Aucune transaction trouvée" });

    // Trouver section la plus proche
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
        Math.sin(dLon/2)*Math.sin(dLon/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    const withDistance = transactions
      .filter(t => t.latitude != null && t.longitude != null)
      .map(t => ({ ...t, distance_m: Math.round(haversine(lat, lon, parseFloat(t.latitude), parseFloat(t.longitude)) * 1000) }))
      .filter(t => t.distance_m <= 1000)
      .sort((a, b) => a.distance_m - b.distance_m);

    const closest = withDistance[0];
    const prix_median_m2 = closest ? closest.prix_median_section || 0 : 0;
    const section_cadastrale = closest ? closest.section_cadastrale : null;
    const sectionPrincipale = closest ? closest.cle_section : null;
    const nbTransactionsSection = sectionPrincipale ? transactions.filter(t => t.cle_section === sectionPrincipale).length : transactions.length;

    // Calcul écart prix
    const prixM2Bien = (prixBienNum && surfaceRecherche) ? prixBienNum / surfaceRecherche : null;
    const ecartPrix = (prixM2Bien && prix_median_m2) ? ((prixM2Bien - prix_median_m2) / prix_median_m2 * 100) : 0;

    // Score opportunité
    const scoring = calculScoreOpportunite(bscoreNum, triNum, cocNum, paybackNum, ecartPrix, nbTransactionsSection);

    const params = {
      adresse_normalisee, section_cadastrale, ville, code_postal,
      prix_median_m2, bscore: bscoreNum, tri: triNum, coc: cocNum,
      payback: paybackNum, prixBien: prixBienNum, surfaceRecherche,
      nbTransactionsSection, scoring
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
