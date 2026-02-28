const fetch = require('node-fetch');
const Papa = require('papaparse');
const fs = require('fs');
const https = require('https');
const readline = require('readline');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Départements à importer - tous les départements France
const DEPARTEMENTS = [
  '01','02','03','04','05','06','07','08','09','10',
  '11','12','13','14','15','16','17','18','19','21',
  '22','23','24','25','26','27','28','29','2A','2B',
  '30','31','32','33','34','35','36','37','38','39',
  '40','41','42','43','44','45','46','47','48','49',
  '50','51','52','53','54','55','56','57','58','59',
  '60','61','62','63','64','65','66','67','68','69',
  '70','71','72','73','74','75','76','77','78','79',
  '80','81','82','83','84','85','86','87','88','89',
  '90','91','92','93','94','95','971','972','973','974'
];

async function importDepartement(dept) {
  console.log(`Importing département ${dept}...`);
  
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${dept}/communes/`;
  
  try {
    // Récupérer la liste des fichiers communes
    const listRes = await fetch(url);
    const html = await listRes.text();
    
    // Extraire les liens CSV
    const csvLinks = [...html.matchAll(/href="([^"]+\.csv)"/g)].map(m => url + m[1]);
    
    for (const csvUrl of csvLinks.slice(0, 5)) { // limiter à 5 communes par dept pour test
      await importCommune(csvUrl, dept);
    }
  } catch (err) {
    console.error(`Erreur dept ${dept}:`, err.message);
  }
}

async function importCommune(csvUrl, dept) {
  try {
    const res = await fetch(csvUrl);
    const text = await res.text();
    
    const parsed = Papa.parse(text, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true
    });
    
    const rows = parsed.data
      .filter(r => parseInt(r.annee_mutation) >= 2020)
      .map(r => ({
        code_postal: r.code_postal || '',
        code_departement: dept,
        nom_commune: r.nom_commune || '',
        section: r.section || '',
        type_bien: r.type_local || '',
        surface: parseFloat(r.surface_reelle_bati) || 0,
        prix_vente: parseFloat(r.valeur_fonciere) || 0,
        prix_m2: parseFloat(r.surface_reelle_bati) > 0 
          ? Math.round(parseFloat(r.valeur_fonciere) / parseFloat(r.surface_reelle_bati)) 
          : 0,
        annee: parseInt(r.annee_mutation) || 0,
        date_mutation: r.date_mutation || ''
      }))
      .filter(r => r.prix_vente > 0 && r.surface > 0);
    
    if (rows.length === 0) return;
    
    // Insérer par batch de 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(batch)
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error(`Erreur insert:`, err);
      } else {
        console.log(`Inserted ${batch.length} rows from ${csvUrl}`);
      }
    }
  } catch (err) {
    console.error(`Erreur commune ${csvUrl}:`, err.message);
  }
}

async function main() {
  // Vider la table d'abord
  await fetch(`${SUPABASE_URL}/rest/v1/transactions?annee=gte.2020`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  for (const dept of DEPARTEMENTS) {
    await importDepartement(dept);
  }
  
  console.log('Import terminé !');
}

main().catch(console.error);
