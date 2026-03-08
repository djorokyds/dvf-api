function calculCapital(mensualite, tauxAnnuel, dureeAns) {
  const t = tauxAnnuel / 100 / 12;
  const n = dureeAns * 12;
  if (t === 0) return mensualite * n;
  return Math.round(mensualite * (1 - Math.pow(1 + t, -n)) / t);
}

function getPrixMedian(transactions) {
  if (!transactions || transactions.length === 0) return null;
  const prix = transactions
    .map(t => t.prix_m2)
    .filter(p => p > 0)
    .sort((a, b) => a - b);
  if (prix.length === 0) return null;
  const mid = Math.floor(prix.length / 2);
  return prix.length % 2 === 0
    ? Math.round((prix[mid - 1] + prix[mid]) / 2)
    : prix[mid];
}

function generateHTML(params, capacite, bienEstime, liens) {
  const { code_postal, type_projet, type_bien, nb_pieces } = params;
  const projetLabel = type_projet === 'locatif' ? '🏢 Investissement locatif' : '🏠 Résidence principale';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recherche Immo - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    .header { background: linear-gradient(135deg, #2c3e50, #27ae60); color: white; padding: 20px 16px; }
    .header h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
    .badge { display: inline-block; margin-top: 8px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-size: 11px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
    .card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card .value { font-size: 18px; font-weight: 700; color: #2c3e50; }
    .card .unit { font-size: 11px; color: #888; margin-top: 2px; }
    .card.highlight { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; grid-column: 1 / -1; }
    .card.highlight .label { color: rgba(255,255,255,0.7); }
    .card.highlight .value { color: white; font-size: 32px; }
    .card.highlight .unit { color: rgba(255,255,255,0.8); }
    .card.warning { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; grid-column: 1 / -1; }
    .card.warning .label { color: rgba(255,255,255,0.7); }
    .card.warning .value { color: white; font-size: 16px; }
    .bien-box { margin: 0 14px 14px; background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #3498db; }
    .bien-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 12px; }
    .bien-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .bien-item .b-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .bien-item .b-value { font-size: 16px; font-weight: 700; color: #2c3e50; }
    .locatif-box { margin: 0 14px 14px; background: #fff9e6; border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #f39c12; }
    .locatif-title { font-size: 12px; font-weight: 600; color: #f39c12; margin-bottom: 6px; }
    .locatif-text { font-size: 12px; color: #666; line-height: 1.6; }
    .section-title { padding: 0 14px 8px; font-size: 13px; font-weight: 600; color: #555; }
    .note { padding: 0 14px 10px; font-size: 10px; color: #aaa; }
    .liens { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 10px; }
    .lien-btn { display: flex; align-items: center; gap: 12px; background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-decoration: none; color: #333; }
    .lien-logo { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .lien-info { flex: 1; }
    .lien-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .lien-desc { font-size: 11px; color: #888; }
    .lien-arrow { font-size: 18px; color: #ccc; }
    .footer { text-align: center; padding: 14px; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏠 Recherche immobilière</h1>
    <p>Code postal : ${code_postal}</p>
    <span class="badge">${projetLabel}</span>
  </div>

  <div class="cards">
    ${capacite.budget > 0 ? `
    <div class="card highlight">
      <div class="label">Budget maximum</div>
      <div class="value">${capacite.budget.toLocaleString('fr-FR')} €</div>
      <div class="unit">Apport ${capacite.apport.toLocaleString('fr-FR')} € + Emprunt ${capacite.capital.toLocaleString('fr-FR')} €</div>
    </div>
    ` : `
    <div class="card warning">
      <div class="label">Capacité insuffisante</div>
      <div class="value">Augmente ton apport ou réduis tes charges</div>
    </div>
    `}
    <div class="card">
      <div class="label">Mensualité max</div>
      <div class="value">${capacite.mensualite.toLocaleString('fr-FR')} €</div>
      <div class="unit">/ mois</div>
    </div>
    <div class="card">
      <div class="label">Marge endettement</div>
      <div class="value">${capacite.marge.toFixed(1)} %</div>
      <div class="unit">disponible sur 35%</div>
    </div>
  </div>

  ${type_projet === 'locatif' ? `
  <div class="locatif-box">
    <div class="locatif-title">ℹ️ Calcul locatif</div>
    <div class="locatif-text">Les loyers estimés (${capacite.loyersEstimes.toLocaleString('fr-FR')} €/mois) sont pris en compte à 70% dans tes revenus bancaires, conformément aux critères bancaires.</div>
  </div>
  ` : ''}

  ${bienEstime ? `
  <div class="bien-box">
    <div class="bien-title">🎯 Profil du bien estimé</div>
    <div class="bien-grid">
      <div class="bien-item">
        <div class="b-label">Surface estimée</div>
        <div class="b-value">${bienEstime.surface} m²</div>
      </div>
      <div class="bien-item">
        <div class="b-label">Prix médian DVF</div>
        <div class="b-value">${bienEstime.prixMedian.toLocaleString('fr-FR')} €/m²</div>
      </div>
      <div class="bien-item">
        <div class="b-label">Type</div>
        <div class="b-value">${type_bien || 'Tous'}</div>
      </div>
      <div class="bien-item">
        <div class="b-label">Pièces</div>
        <div class="b-value">${nb_pieces || '-'}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section-title">🔍 Rechercher des annonces</div>
  <p class="note">* Liens pré-filtrés selon ton budget et ton profil</p>
  <div class="liens">
    <a href="${liens.leboncoin}" target="_blank" class="lien-btn">
      <div class="lien-logo" style="background:#f5f0e8;">🟠</div>
      <div class="lien-info">
        <div class="lien-name">LeBonCoin</div>
        <div class="lien-desc">${type_bien || 'Biens'} • ${code_postal} • max ${capacite.budget.toLocaleString('fr-FR')} €</div>
      </div>
      <div class="lien-arrow">›</div>
    </a>
    <a href="${liens.pap}" target="_blank" class="lien-btn">
      <div class="lien-logo" style="background:#e8f4f8;">🔵</div>
      <div class="lien-info">
        <div class="lien-name">PAP</div>
        <div class="lien-desc">${type_bien || 'Biens'} • ${code_postal} • max ${capacite.budget.toLocaleString('fr-FR')} €</div>
      </div>
      <div class="lien-arrow">›</div>
    </a>
    <a href="${liens.bienici}" target="_blank" class="lien-btn">
      <div class="lien-logo" style="background:#e8f8f0;">🟢</div>
      <div class="lien-info">
        <div class="lien-name">Bien'ici</div>
        <div class="lien-desc">${type_bien || 'Biens'} • ${code_postal} • max ${capacite.budget.toLocaleString('fr-FR')} €</div>
      </div>
      <div class="lien-arrow">›</div>
    </a>
  </div>

  <div class="footer">Calculs basés sur les données DVF et un taux d'endettement max de 35% • Fi-One</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const {
    revenus_bancaires,
    taux_endettement,
    apport,
    duree_emprunt,
    taux_immobilier,
    type_projet,
    type_bien,
    nb_pieces,
    code_postal,
    format
  } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!revenus_bancaires || !taux_endettement || !apport || !duree_emprunt || !taux_immobilier || !code_postal) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const revenusNum = parseFloat(revenus_bancaires.replace(/\s/g, '').replace(',', '.'));
    const tauxEndettementNum = parseFloat(taux_endettement.replace(',', '.'));
    const apportNum = parseFloat(apport.replace(/\s/g, '').replace(',', '.'));
    const dureeNum = parseInt(duree_emprunt);
    const tauxImmoNum = parseFloat(taux_immobilier.replace(',', '.'));
    const nbPiecesNum = nb_pieces ? parseInt(nb_pieces) : null;

    const marge = 35 - tauxEndettementNum;

    let revenusEffectifs = revenusNum;
    let loyersEstimes = 0;

    if (type_projet === 'locatif') {
      const mensualiteBrute = revenusNum * (marge / 100);
      const capitalBrut = calculCapital(mensualiteBrute, tauxImmoNum, dureeNum);
      const budgetBrut = capitalBrut + apportNum;
      loyersEstimes = Math.round(budgetBrut * 0.05 / 12);
      revenusEffectifs = revenusNum + loyersEstimes * 0.7;
    }

    const mensualiteMax = Math.round(revenusEffectifs * (marge / 100));
    const capital = calculCapital(mensualiteMax, tauxImmoNum, dureeNum);
    const budget = capital + apportNum;

    const capacite = {
      marge,
      mensualite: mensualiteMax,
      capital,
      apport: apportNum,
      budget,
      loyersEstimes
    };

    // Prix médian DVF
    let bienEstime = null;
    try {
      let dvfUrl = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${code_postal}&select=prix_m2&limit=500`;
      if (type_bien) dvfUrl += `&type_bien=eq.${encodeURIComponent(type_bien)}`;
      const dvfRes = await fetch(dvfUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
        }
      });
      const dvfData = await dvfRes.json();
      if (Array.isArray(dvfData) && dvfData.length > 0) {
        const prixMedian = getPrixMedian(dvfData);
        if (prixMedian && budget > 0) {
          bienEstime = {
            surface: Math.round(budget / prixMedian),
            prixMedian
          };
        }
      }
    } catch (e) {}

    // Génération des liens
    const budgetMax = Math.round(budget);
    const surfaceMin = bienEstime ? Math.max(20, bienEstime.surface - 15) : 30;
    const surfaceMax = bienEstime ? bienEstime.surface + 15 : 100;

    // LeBonCoin
    const leboncoin = `https://www.leboncoin.fr/recherche?category=9&locations=${code_postal}&real_estate_type=${type_bien === 'Maison' ? '2' : '1'}&price=0-${budgetMax}&square=${surfaceMin}-${surfaceMax}${nbPiecesNum ? `&rooms=${nbPiecesNum}-${nbPiecesNum + 1}` : ''}`;

    // PAP
    const papType = type_bien === 'Maison' ? 'maison' : type_bien === 'Appartement' ? 'appartement' : 'bien-immobilier';
    const pap = `https://www.pap.fr/annonce/vente-${papType}-${code_postal}?prix-max=${budgetMax}&surface-min=${surfaceMin}${nbPiecesNum ? `&nb-pieces-min=${nbPiecesNum}` : ''}`;

    // Bien'ici
    const bieniciType = type_bien === 'Maison' ? 'maison' : type_bien === 'Appartement' ? 'appartement' : '';
    const bienici = `https://www.bienici.com/recherche/achat/${code_postal}${bieniciType ? `/${bieniciType}` : ''}?prix-max=${budgetMax}&surface-min=${surfaceMin}${nbPiecesNum ? `&nb-pieces-min=${nbPiecesNum}` : ''}`;

    const liens = { leboncoin, pap, bienici };

    if (format === 'html') {
      const html = generateHTML(
        { code_postal, type_projet, type_bien, nb_pieces },
        capacite,
        bienEstime,
        liens
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(200).json({
      success: true,
      capacite,
      bienEstime,
      liens
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
