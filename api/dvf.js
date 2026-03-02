/**
 * FONCTIONS DE CALCUL STATISTIQUES
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
 * GENERATION DU DASHBOARD HTML
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
    <title>Analyse Immo Pro - ${adresse_normalisee}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { font-family: -apple-system, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 900px; margin: auto; }
      .header { background: #1e293b; color: white; padding: 25px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .fiabilite { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-top: 10px; }
      .f-haute { background: #dcfce7; color: #166534; } .f-moyenne { background: #fef9c3; color: #854d0e; } .f-faible { background: #fee2e2; color: #991b1b; }
      .card { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 20px; }
      .prix-v { font-size: 38px; font-weight: 800; color: #0f172a; margin: 10px 0; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
      .stat-box { background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      #map { height: 350px; border-radius: 16px; margin-bottom: 20px; z-index: 1; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 16px; text-align: left; border-bottom: 1px solid #f1f5f9; }
      th { background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
      .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
      .maison { background: #f0fdf4; color: #166534; } .appart { background: #f0f9ff; color: #075985; }
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1 style="margin:0; font-size:22px;">📍 ${adresse_normalisee}</h1>
        <div class="fiabilite ${fiabilite.class}">${fiabilite.icon} Fiabilité : ${fiabilite.label} (${transactions.length} ventes)</div>
      </div>
      
      ${surfR ? `
        <div class="card">
          <div style="color:#64748b; font-size:12px; font-weight:700;">ESTIMATION BASÉE SUR LA MÉDIANE</div>
          <div class="prix-v">${Math.round(estimation.prix).toLocaleString('fr-FR')} €</div>
          <div style="color:#475569; font-size:14px;">Fourchette de marché : <b>${Math.round(estimation.min).toLocaleString('fr-FR')}€</b> - <b>${Math.round(estimation.max).toLocaleString('fr-FR')}€</b></div>
          ${analysePerso ? `
            <div style="margin-top:20px; padding-top:15px; border-top:1px solid #f1f5f9; color:${analysePerso.ecart > 0 ? '#ef4444' : '#10b981'}; font-weight:bold; display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">${analysePerso.ecart > 0 ? '🔴' : '🟢'}</span>
              Votre prix est ${Math.round(Math.abs(analysePerso.ecart))}% ${analysePerso.ecart > 0 ? 'au-dessus' : 'sous le'} marché.
            </div>` : ''}
        </div>` : ''}

      <div class="stats-grid">
        <div class="stat-box"><small>P25 (Bas)</small><br><b>${Math.round(stats.p25)} €/m²</b></div>
        <div class="stat-box" style="border: 2px solid #3b82f6;"><small>MÉDIANE</small><br><b style="color:#3b82f6; font-size:20px;">${Math.round(stats.mediane)} €/m²</b></div>
        <div class="stat-box"><small>P75 (Haut)</small><br><b>${Math.round(stats.p75)} €/m²</b></div>
      </div>

      <div id="map"></div>

      <div class="card" style="padding:0; overflow:hidden;">
        <table><thead><tr><th>Type</th><th>Surf.</th><th>Prix Net</th><th>Prix m²</th><th>Dist.</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>

    <script>
      const map = L.map('map', { scrollWheelZoom: false }).setView([${userLat}, ${userLon}], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([${userLat}, ${userLon}]).addTo(map).bindPopup('<b>Cible</b>').openPopup();
      ${transactions.map(t => `L.circleMarker([${t.latitude}, ${t.longitude}], {radius:9, color:'white', weight:2, fillColor:'${t.type_bien==='Maison'?'#10b981':'#3b82f6'}', fillOpacity:0.9}).addTo(map);`).join('')}
    </script>
</body></html>`;
}

/**
 * HANDLER PRINCIPAL VERCEL
 */
export default async function handler(req, res) {
  const { adresse, type_bien, surface, prix, format } = req.query;
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;

  try {
    if (!adresse) throw new Error("Adresse manquante");
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Variables de configuration manquantes sur Vercel");

    // 1. GÉOCODAGE
    const geo = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`).then(r => r.json());
    if (!geo.features?.length) throw new Error("Adresse introuvable");
    const [lon, lat] = geo.features[0].geometry.coordinates;
    const cp = geo.features[0].properties.postcode;

    // 2. APPEL SUPABASE OPTIMISÉ (Sélection des colonnes pour éviter le timeout)
    const cols = "type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,latitude,longitude,date_mutation";
    let url = `${SUPABASE_URL}/rest/v1/transactions?code_postal=eq.${cp}&select=${cols}&prix_m2=gt.0`;
    if (type_bien) url += `&type_bien=eq.${encodeURIComponent(type_bien)}`;

    const response = await fetch(url, { 
        headers: { 
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Range': '0-499' // Limite à 500 résultats pour la performance
        } 
    });
    
    const dataSupa = await response.json();

    if (!Array.isArray(dataSupa)) {
      return res.status(500).json({ error: "Erreur Supabase", details: dataSupa });
    }

    // 3. FILTRAGE ET CALCULS
    const surfR = parseFloat(surface);
    const prixR = parseFloat(prix);

    const filtered = dataSupa
      .map(t => ({ 
        ...t, 
        distance_m: Math.round(haversine(lat, lon, t.latitude, t.longitude) * 1000) 
      }))
      .filter(t => t.distance_m <= 500) // Rayon de 500m
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 25);

    if (filtered.length === 0) return res.status(404).json({ error: "Aucune vente trouvée dans ce périmètre." });

    const prixM2 = filtered.map(t => t.prix_m2);
    const stats = { 
      p25: getQuartile(prixM2, 0.25), 
      mediane: getQuartile(prixM2, 0.5), 
      p75: getQuartile(prixM2, 0.75) 
    };

    const fiabilite = filtered.length >= 15 ? { label: 'Forte', class: 'f-haute', icon: '🟢' } : 
                     (filtered.length >= 5 ? { label: 'Moyenne', class: 'f-moyenne', icon: '🟡' } : 
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
    
    return res.status(200).json({ stats, fiabilite, transactions: filtered });

  } catch (err) {
    return res.status(500).json({ error: "Erreur Serveur", message: err.message });
  }
}
