/**
 * UTILS & MATHS
 */
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

/**
 * DASHBOARD HTML
 */
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

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Expertise DVF - ${adresse_normalisee}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #334155; }
      .container { max-width: 850px; margin: auto; }
      .header { background: #0f172a; color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
      .fiabilite { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
      .f-haute { background: #dcfce7; color: #166534; } .f-moyenne { background: #fef9c3; color: #854d0e; } .f-faible { background: #fee2e2; color: #991b1b; }
      .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; border: 1px solid #e2e8f0; }
      .prix-v { font-size: 36px; font-weight: 800; color: #0f172a; margin: 5px 0; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
      .stat-box { background: white; padding: 15px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
      #map { height: 300px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
      th { background: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; }
      .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
      .maison { background: #ecfdf5; color: #065f46; } .appart { background: #eff6ff; color: #1e40af; }
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1 style="margin:0; font-size:20px;">Analyse de Marché Immobilière</h1>
        <div style="opacity: 0.8; font-size: 14px;">📍 ${adresse_normalisee}</div>
        <div class="fiabilite ${fiabilite.class}">${fiabilite.icon} Fiabilité : ${fiabilite.label}</div>
      </div>
      
      ${surfR ? `
        <div class="card">
          <div style="color:#64748b; font-size:11px; font-weight:700; letter-spacing: 0.05em;">ESTIMATION BASÉE SUR LES VENTES RÉCENTES</div>
          <div class="prix-v">${Math.round(estimation.prix).toLocaleString('fr-FR')} €</div>
          <div style="color:#475569; font-size:13px;">Cœur de marché : <b>${Math.round(estimation.min).toLocaleString('fr-FR')}€</b> - <b>${Math.round(estimation.max).toLocaleString('fr-FR')}€</b></div>
          ${analysePerso ? `
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid #f1f5f9; color:${analysePerso.ecart > 0 ? '#ef4444' : '#10b981'}; font-weight:bold;">
              ${analysePerso.ecart > 0 ? '⚠️' : '✅'} Votre prix est ${Math.round(Math.abs(analysePerso.ecart))}% ${analysePerso.ecart > 0 ? 'au-dessus' : 'en-dessous'} du prix médian.
            </div>` : ''}
        </div>` : ''}

      <div class="stats-grid">
        <div class="stat-box"><small style="color:#64748b; font-size:10px;">P25 (Bas)</small><br><b>${Math.round(stats.p25)} €/m²</b></div>
        <div class="stat-box" style="border-color: #3b82f6;"><small style="color:#3b82f6; font-size:10px;">MÉDIANE</small><br><b style="color:#3b82f6; font-size:18px;">${Math.round(stats.mediane)} €/m²</b></div>
        <div class="stat-box"><small style="color:#64748b; font-size:10px;">P75 (Haut)</small><br><b>${Math.round(stats.p75)} €/m²</b></div>
      </div>

      <div id="map"></div>

      <div class="card" style="padding:0; overflow:hidden;">
        <table><thead><tr><th>Type</th><th>Surf.</th><th>Valeur</th><th>m²</th><th>Dist.</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
    <script>
      const map = L.map('map', { scrollWheelZoom: false }).setView([${userLat}, ${userLon}], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('<b>Cible</b>').openPopup();
      ${transactions.map(t => `L.circleMarker([${t.latitude}, ${t.longitude}], {radius:8, color:'white', weight:2, fillColor:'${t.type_bien==='Maison'?'#10b981':'#3b82f6'}', fillOpacity:0.9}).addTo(map);`).join('')}
    </script>
</body></html>`;
}

/**
 * MAIN VERCEL HANDLER
 */
export default async function handler(req, res) {
  const { adresse, type_bien, surface, prix, format } = req.query;
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;

  try {
    if (!adresse) throw new Error("Paramètre 'adresse' requis.");
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Clés Supabase manquantes dans Vercel.");

    // 1. GÉOCODAGE
    const geo = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`).then(r => r.json());
    if (!geo.features?.length) throw new Error("Géocodage impossible.");
    const [lon, lat] = geo.features[0].geometry.coordinates;
    const cp = geo.features[0].properties.postcode;

    // 2. PRÉPARATION REQUÊTE SUPABASE (FILTRE TEMPOREL 3 ANS)
    const dateLimite = new Date();
    dateLimite.setFullYear(dateLimite.getFullYear() - 3);
    const dateStr = dateLimite.toISOString().split('T')[0];

    const cols = "type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,latitude,longitude,date_mutation";
    let url = `${SUPABASE_URL}/rest/v1/transactions?select=${cols}&code_postal=eq.${cp}&prix_m2=gt.100&date_mutation=gte.${dateStr}`;
    
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const response = await fetch(url, { 
        headers: { 
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Range': '0-99' // Sécurité : on ne traite que les 100 dernières transactions
        } 
    });
    
    const dataSupa = await response.json();

    if (!Array.isArray(dataSupa)) {
      return res.status(500).json({ error: "Erreur base de données (Timeout possible)", details: dataSupa });
    }

    // 3. TRAITEMENT
    const surfR = parseFloat(surface);
    const prixR = parseFloat(prix);

    const filtered = dataSupa
      .map(t => ({ 
        ...t, 
        distance_m: Math.round(haversine(lat, lon, t.latitude, t.longitude) * 1000) 
      }))
      .filter(t => t.distance_m <= 600) // Rayon de 600m
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 20);

    if (filtered.length === 0) return res.status(404).json({ error: "Aucune donnée DVF trouvée à proximité." });

    const prixM2 = filtered.map(t => t.prix_m2);
    const stats = { 
      p25: getQuartile(prixM2, 0.25), 
      mediane: getQuartile(prixM2, 0.5), 
      p75: getQuartile(prixM2, 0.75) 
    };

    const fiabilite = filtered.length >= 12 ? { label: 'Élevée', class: 'f-haute', icon: '🟢' } : 
                     (filtered.length >= 5 ? { label: 'Modérée', class: 'f-moyenne', icon: '🟡' } : 
                     { label: 'Faible', class: 'f-faible', icon: '🔴' });

    const estimation = surfR ? { prix: stats.mediane * surfR, min: stats.p25 * surfR, max: stats.p75 * surfR } : null;
    const analysePerso = (prixR && surfR) ? { ecart: (((prixR / surfR) - stats.mediane) / stats.mediane) * 100 } : null;

    // 4. RÉPONSE
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(generateHTML({ 
        adresse_normalisee: geo.features[0].properties.label, 
        stats, fiabilite, estimation, analysePerso, 
        transactions: filtered 
      }, lat, lon, surfR, prixR));
    }
    
    return res.status(200).json({ stats, fiabilite, estimation, transactions: filtered });

  } catch (err) {
    return res.status(500).json({ error: "Erreur Serveur", message: err.message });
  }
}
