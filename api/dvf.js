export default async function handler(req, res) {
  const { code_postal } = req.query;
  
  if (!code_postal) {
    return res.status(400).json({ error: "code_postal manquant" });
  }

  try {
    // Étape 1 : code INSEE
    const geoRes = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code_postal}&fields=code,nom&format=json`);
    const communes = await geoRes.json();
    
    if (!communes || communes.length === 0) {
      return res.status(404).json({ error: "Code postal non trouvé" });
    }
    
    const code_insee = communes[0].code;
    const nom_commune = communes[0].nom;
    
    // Étape 2 : DVF
    const dvfRes = await fetch(`https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${code_insee}&ordering=-date_mutation&page_size=100`);
    const dvfData = await dvfRes.json();
    const transactions = dvfData.results || [];
    
    // Étape 3 : extraire section depuis l_idpar
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
        annee: t.anneemut || "",
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
    
    return res.status(200).json({
      nom_commune,
      code_postal,
      nb_total: enriched.length,
      sections,
      transactions: enriched
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
