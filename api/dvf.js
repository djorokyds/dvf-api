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
    
    // Étape 2 : DVF - 100 dernières transactions depuis 2022
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
    
    // Étape 4 : grouper par section
    const parSection = {};
    enriched.forEach(t => {
      if (!parSection[t.section]) {
        parSection[t.section] = {
          section: t.section,
          nom_section: `Section ${t.section} - ${nom_commune}`,
          commune: nom_commune,
          code_postal,
          nb_transactions: 0,
          prix_m2_list: [],
          types: []
        };
      }
      parSection[t.section].nb_transactions++;
      if (t.prix_m2 > 0) parSection[t.section].prix_m2_list.push(t.prix_m2);
      if (!parSection[t.section].types.includes(t.type_bien)) {
        parSection[t.section].types.push(t.type_bien);
      }
    });
    
    const sections = Object.values(parSection).map(s => ({
      section: s.section,
      nom_section: s.nom_section,
      commune: s.commune,
      code_postal: s.code_postal,
      nb_transactions: s.nb_transactions,
      prix_median_m2: s.prix_m2_list.length > 0
        ? Math.round(s.prix_m2_list.reduce((a,b) => a+b,0) / s.prix_m2_list.length)
        : 0,
      types_biens: s.types.join(", ")
    }));
    
    // Étape 5 : écrire dans Airtable Sections
    const sectionsPayload = sections.map(s => ({
      fields: {
        code_postal: s.code_postal,
        nom_commune: s.commune,
        section: s.section,
        nom_section: s.nom_section,
        nb_transactions: s.nb_transactions,
        prix_median_m2: s.prix_median_m2,
        types_biens: s.types_biens
      }
    }));

    for (let i = 0; i < sectionsPayload.length; i += 10) {
      const batch = sectionsPayload.slice(i, i + 10);
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sections`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: batch })
      });
    }

    // Étape 6 : écrire dans Airtable Transactions
    const transactionsPayload = enriched.map(t => ({
      fields: {
        code_postal: t.code_postal,
        nom_commune: t.nom_commune,
        section: t.section,
        type_bien: t.type_bien,
        surface: t.surface,
        prix_vente: t.prix_vente,
        prix_m2: t.prix_m2,
        annee: t.annee,
        date_mutation: t.date_mutation
      }
    }));

    for (let i = 0; i < transactionsPayload.length; i += 10) {
      const batch = transactionsPayload.slice(i, i + 10);
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transactions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: batch })
      });
    }
    
    return res.status(200).json({
      success: true,
      nom_commune,
      nb_sections: sections.length,
      nb_transactions: enriched.length
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
