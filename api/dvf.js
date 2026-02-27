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
    const allTransactions = dvfData.results || [];
    const transactions = allTransactions.filter(t => {
      const annee = parseInt(t.anneemut) || 0;
      return annee >= 2022;
    });
    
    // Étape 3 : extraire section et convertir les types
    const enriched = transactions.map(t => {
      const idpar = t.l_idpar?.[0] || "";
      const section = idpar.slice(8, 10) || "??";
      const surface = parseFloat(t.sbati) || 0;
      const prix_vente = parseFloat(t.valeurfonc) || 0;
      const prix_m2 = surface > 0 ? Math.round(prix_vente / surface) : 0;
      return {
        code_postal,
        nom_commune,
        section,
        type_bien: t.libtypbien || "",
        surface,
        prix_vente,
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
    
    // Étape 5 : vider anciennes sections
    const oldSections = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sections?maxRecords=200`, {
      headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}` }
    });
    const oldSectionsData = await oldSections.json();
    const oldSectionIds = (oldSectionsData.records || []).map(r => r.id);
    
    for (let i = 0; i < oldSectionIds.length; i += 10) {
      const batch = oldSectionIds.slice(i, i + 10);
      const params = batch.map(id => `records[]=${id}`).join("&");
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sections?${params}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}` }
      });
    }

    // Étape 6 : vider anciennes transactions
    const oldTrans = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transactions?maxRecords=200`, {
      headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}` }
    });
    const oldTransData = await oldTrans.json();
    const oldTransIds = (oldTransData.records || []).map(r => r.id);
    
    for (let i = 0; i < oldTransIds.length; i += 10) {
      const batch = oldTransIds.slice(i, i + 10);
      const params = batch.map(id => `records[]=${id}`).join("&");
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Transactions?${params}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}` }
      });
    }

    // Étape 7 : écrire nouvelles sections
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

    // Étape 8 : écrire nouvelles transactions
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
