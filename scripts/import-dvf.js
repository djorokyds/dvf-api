const https = require('https');
const Papa = require('papaparse');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const DEPARTEMENTS = ['76'];  // On commence par 76 pour tester

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function insertRows(rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows);
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/transactions`);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function importDepartement(dept) {
  console.log(`Importing département ${dept}...`);
  
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${dept}/`;
  
  try {
    const html = await fetchUrl(url);
    const csvLinks = [...html.matchAll(/href="(full\.csv)"/g)].map(m => url + m[1]);
    
    if (csvLinks.length === 0) {
      console.log(`Pas de fichier full.csv trouvé pour ${dept}, essai avec communes...`);
      const communeLinks = [...html.matchAll(/href="([^"]+\.csv)"/g)].map(m => url + m[1]);
      console.log(`Liens trouvés: ${communeLinks.slice(0, 3).join(', ')}`);
      return;
    }
    
    for (const csvUrl of csvLinks) {
      console.log(`Téléchargement: ${csvUrl}`);
      const text = await fetchUrl(csvUrl);
      
      const parsed = Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true
      });
      
      console.log(`Colonnes: ${Object.keys(parsed.data[0] || {}).join(', ')}`);
      console.log(`Total lignes: ${parsed.data.length}`);
      
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
      
      console.log(`Lignes filtrées >= 2020: ${rows.length}`);
      
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const result = await insertRows(batch);
