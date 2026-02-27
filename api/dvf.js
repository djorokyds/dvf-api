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
    
    // Étape 2 : DVF
    const dvfRes = await fetch(`https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${code_insee}&ordering=-date_mutation&page_size=100&date_mutation_min=2022-01-01`);
    const dvfData = await dvfRes.json();
    const transactions = dvfData.results || [];
    
    // Étape 3 : extraire section
    const enriched = transactions.map(t => {
      const idpar = t.l_idpar?.[0] || "";
      const section = idpar.slice(8, 10) || "??";
      const prix_m2 = t.sbati > 0 ? Math.round(t.valeurfonc / t.sbati) : 0;
      return {
        code_postal,
        nom_commune,
        section,
        type_bien: t.libtypbien || "",
        surface: t.sbati || 0,
        prix_vente: t.valeurfonc || 0,
        prix_m2,
        annee: String(t.anneemut || ""),
        date_mutation: t.date_mutation || ""
      };
    });

    // Test : écrire juste 1 transaction
    const testPayload = [{
      fields: {
        code_postal: enriched[0].code_postal,
        nom_commune: enriched[0].nom_commune,
        section: enriched[0].section,
        type_bien: enriched[0].type_bien,
        surface: enriched[0].surface,
        prix_vente: enriched[0].prix_vente,
        prix_m2: enriched[0].prix_m2,
        annee: enriched[0].annee,
        date_mutation: enriched[0].date_mutation
      }
    }];

    const testRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ records: testPayload })
    });
    
    const testData = await testRes.json();
    
    return res.status(200).json({
      status: testRes.status,
      response: testData,
      sample: enriched[0]
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
