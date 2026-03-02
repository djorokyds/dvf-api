// Fonctions de calcul
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const getQuartile = (values, q) => {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
};

// Interface HTML
function generateHTML(data, userLat, userLon, surfR, prixR) {
  const { adresse_normalisee, stats, fiabilite, estimation, transactions, analysePerso } = data;
  
  const rows = transactions.map(t => {
    const ecart = stats.mediane > 0 ? ((t.prix_m2 - stats.mediane) / stats.mediane) * 100 : 0;
    return `<tr>
      <td><span class="badge ${t.type_bien === 'Maison' ? 'maison' : 'appart'}">${t.type_bien}</span></td>
      <td>${t.surface} m²</td>
      <td>${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €</td>
      <td><strong>${t.prix_m2} €/m²</strong><br><small style="color:${ecart > 0 ? '#e74c3c' : '#27ae60'}">${ecart > 0 ? '+' : ''}${Math.round(ecart)}% /marché</small></td>
      <td>${t.distance_m} m</td>
      <td>${t.date_mutation}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Analyse DVF</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { font-family: system-ui; background: #f8fafc; margin: 0; padding: 20px; }
      .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
      .header { background: #1e293b; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
      .f-haute { color: #166534; background: #dcfce7; padding: 5px 10px; border-radius: 20px; }
      .f-moyenne { color: #854d0e; background: #fef9c3; padding: 5px 10px; border-radius: 20px; }
      .f-faible { color: #991b1b; background: #fee2e2; padding: 5px 10px; border-radius: 20px; }
      .prix-v { font-size: 32px; font-weight: bold; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
      .maison { background: #dcfce7; color: #166534; } .appart { background: #e0f2fe; color: #075985; }
      #map { height: 300px; border-radius: 12px; }
    </style></head><body>
    <div class="header"><h1>${adresse_normalisee}</h1>
    <span class="${fiabilite.class}">${fiabilite.icon} Fiabilité : ${fiabilite.label}</span></div>
    
    ${surfR ? `
      <div class="card">
        <div style="font-size:12px; color:#64748b;">ESTIMATION RECOMMANDÉE</div>
        <div class="prix-v">${Math.round(estimation.prix).toLocaleString('fr-FR')} €</div>
        <div style="color:#64748b;">Marché local : ${Math.round(estimation.min).toLocaleString('fr-FR')}€ - ${Math.round(estimation.max).toLocaleString('fr-FR')}€</div>
        ${analysePerso ? `<div style="margin-top:15px; font-weight:bold; color:${analysePerso.ecart > 0 ? '#e74c3c' : '#27ae60'}">
          Votre prix est ${Math.round(Math.abs(analysePerso.ecart))}% ${analysePerso.ecart > 0 ? 'au-dessus' : 'en-dessous'} du marché.
        </div>` : ''}
      </div>` : ''}

    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
      <div class="card" style="text-align:center;"><small>P25</small><br><b>${Math.round(stats.p25)} €/m²</b></div>
      <div class="card" style="text-align:center;"><small>MÉDIANE</small><br><b style="color:#3b82f6;">${Math.round(stats.mediane)} €/m²</b></div>
      <div class="card" style="text-align:center;"><small>P75</small><br><b>${Math.round(stats.p75)} €/m²</b></div>
    </div>

    <div id="map" class="card"></div>

    <div class="card" style="padding:0; overflow:hidden;">
      <table><thead><tr><th>Type</th><th>Surf.</th><th>Prix</th><th>m²</th><th>Dist.</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>

    <script>
      const map = L.map('map').setView([${userLat}, ${userLon}], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('Cible').openPopup();
      ${transactions.map(t => `L.circleMarker([${t.latitude}, ${t.longitude}], {radius:8, color:'white', weight:2, fillColor:'${t.type_bien === 'Maison' ? '#22c55e' : '#3b82f6'}', fillOpacity:0.9}).addTo(map);`).join('')}
    </script>
</body></html>`;
}

export default async function handler(req, res) {
  const { adresse, type_bien, surface, prix, format } = req.query;
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;

  try {
    if (!adresse) throw new Error("Adresse manquante");
    
    // Diagnostic des clés
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ 
        error: "Variables Vercel manquantes", 
        url_presente: !!SUPABASE_URL, 
        key_presente: !!SUPABASE_KEY 
      });
    }

    const geo = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`).then(r => r.json());
    const [lon, lat] = geo.features[0].geometry.coordinates;
    const cp = geo.features[0].properties.postcode;

    // Construction de l'URL
    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${cp}&select=*`;
    
    // Appel à Supabase
    const response = await fetch(url, { 
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } 
    });
    
    const dataSupa = await response.json();

    // LE DIAGNOSTIC CRUCIAL :
    if (!Array.isArray(dataSupa)) {
      return res.status(500).json({ 
        error: "Supabase n'a pas renvoyé de tableau",
        status_code: response.status,
        reponse_brute: dataSupa, // C'est ici qu'on verra l'erreur réelle
        url_appelée: url
      });
    }

    // ... (la suite du code reste identique pour le filtrage et l'affichage)
    // Mais assurez-vous de bien garder la suite du calcul pour que le format=html fonctionne
    const surfR = parseFloat(surface);
    const prixR = parseFloat(prix);
    const filtered = dataSupa
      .map(t => ({ ...t, distance_m: Math.round(haversine(lat, lon, t.latitude, t.longitude) * 1000) }))
      .filter(t => t.distance_m <= 500)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 20);

    const prixM2 = filtered.map(t => t.prix_m2);
    const stats = { p25: getQuartile(prixM2, 0.25), mediane: getQuartile(prixM2, 0.5), p75: getQuartile(prixM2, 0.75) };
    const fiabilite = filtered.length >= 15 ? { label: 'Forte', class: 'f-haute', icon: '🟢' } : (filtered.length >= 5 ? { label: 'Moyenne', class: 'f-moyenne', icon: '🟡' } : { label: 'Faible', class: 'f-faible', icon: '🔴' });
    const estimation = surfR ? { prix: stats.mediane * surfR, min: stats.p25 * surfR, max: stats.p75 * surfR } : null;
    const analysePerso = (prixR && surfR) ? { ecart: (((prixR / surfR) - stats.mediane) / stats.mediane) * 100 } : null;

    if (format === 'html') return res.setHeader('Content-Type', 'text/html; charset=utf-8').status(200).send(generateHTML({ adresse_normalisee: geo.features[0].properties.label, stats, fiabilite, estimation, analysePerso, transactions: filtered }, lat, lon, surfR, prixR));
    
    return res.status(200).json({ stats, fiabilite, transactions: filtered });

  } catch (err) {
    return res.status(500).json({ error: "Crash Critique", message: err.message });
  }
}
