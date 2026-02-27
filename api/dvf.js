export default async function handler(req, res) {
  const { code_postal } = req.query;
  
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  
  if (!code_postal) {
    return res.status(400).json({ error: "code_postal manquant" });
  }

  try {
    // Étape 1 : code INSEE
    const geoRes = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code_postal}&fields=code,nom&format=json`);
    const communes = await geoRes.json();
    const code_insee = communes[0].code;
    const nom_commune = communes[0].nom;
    
    // Étape 2 : DVF sans filtre de date
    const dvfRes = await fetch(`https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${code_insee}&ordering=-date_mutation&page_size=100`);
    const dvfData = await dvfRes.json();
    const allTransactions = dvfData.results || [];

    // Debug : années disponibles
    const annees = [...new Set(allTransactions.map(t => t.anneemut))].sort();
    
    return res.status(200).json({
      success: true,
      nom_commune,
      annees_disponibles: annees,
      nb_total: allTransactions.length
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
