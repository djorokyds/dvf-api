// ===============================
// Utils
// ===============================

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function percentile(arr,p){
  const index = (p/100)*(arr.length-1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index-lower;
  if(upper>=arr.length) return arr[lower];
  return arr[lower]*(1-weight)+arr[upper]*weight;
}

function scoreTransaction(t,distanceKm,surfaceRecherche,nbPiecesRecherche,prixMedianSection){
  const distanceM = distanceKm*1000;
  const scoreDistance = 40*Math.exp(-distanceM/300);
  let scoreSurface = 25;
  if(surfaceRecherche && t.surface){
    const ecart = Math.abs(t.surface-surfaceRecherche)/surfaceRecherche;
    scoreSurface = Math.max(0,25-ecart*50);
  }
  let scorePieces=20;
  if(nbPiecesRecherche && t.nb_pieces){
    const ecart = Math.abs(t.nb_pieces-nbPiecesRecherche);
    scorePieces = Math.max(0,20-ecart*8);
  }
  let scoreDecote=0;
  if(prixMedianSection && t.prix_m2){
    const decote = (prixMedianSection-t.prix_m2)/prixMedianSection;
    if(decote>0) scoreDecote = Math.min(15,decote*60);
  }
  return Math.round(scoreDistance+scoreSurface+scorePieces+scoreDecote);
}

// ===============================
// HTML Generator
// ===============================

function generateHTML(data, userLat, userLon, surfaceRecherche, nbPiecesRecherche){
  const {adresse_normalisee, ville, code_postal, marche, analyse_bien, comparables} = data;

  const rows = comparables.map((t,i)=>`
    <tr>
      <td>${t.type_bien}</td>
      <td>${t.surface||'-'} m²</td>
      <td>${t.nb_pieces||'-'}</td>
      <td>${Math.round(t.valeur_fonciere).toLocaleString('fr-FR')} €</td>
      <td>${t.prix_m2} €/m²</td>
      <td>${t.distance_m} m</td>
      <td>
        <div style="background:#eee;width:80px;height:16px;border-radius:8px;overflow:hidden;position:relative;">
          <div style="width:${t.score}%;background:linear-gradient(90deg,#f39c12,#2ecc71);height:100%;"></div>
        </div>
      </td>
    </tr>
  `).join('');

  const analyseHTML = analyse_bien ? `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
      <div style="padding:10px;background:#fff;border-radius:10px;flex:1;">
        <strong>Verdict:</strong> ${analyse_bien.verdict} (${analyse_bien.ecart_pct}%)<br>
        Prix recommandé: ${analyse_bien.prix_recommande.toLocaleString('fr-FR')} €<br>
        Fourchette: ${analyse_bien.fourchette_basse.toLocaleString('fr-FR')} - ${analyse_bien.fourchette_haute.toLocaleString('fr-FR')} €
      </div>
      <div style="padding:10px;background:#fff;border-radius:10px;flex:1;">
        <strong>Marché:</strong> ${marche.dispersion}, ${marche.tension}, ${marche.fiabilite}<br>
        Prix médian m²: ${marche.median_m2} €
      </div>
    </div>
  `:''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Analyse DVF - ${adresse_normalisee}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body style="font-family:sans-serif;background:#f5f7fa;margin:0;padding:0;">
<h2 style="padding:14px">${adresse_normalisee} - ${ville} (${code_postal})</h2>

${analyseHTML}

<div id="map" style="height:300px;margin:14px;"></div>

<table style="width:100%;border-collapse:collapse;margin:14px;background:#fff;border-radius:10px;overflow:hidden;">
<thead style="background:#eee;">
<tr>
<th>Type</th><th>Surface</th><th>Pièces</th><th>Valeur</th><th>€/m²</th><th>Distance</th><th>Score</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>

<script>
const map = L.map('map').setView([${userLat},${userLon}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
L.circle([${userLat},${userLon}],{radius:500,color:'#e74c3c',fillColor:'#e74c3c',fillOpacity:0.05,weight:1,dashArray:'5,5'}).addTo(map);
L.marker([${userLat},${userLon}]).addTo(map).bindPopup('<strong>Votre adresse</strong><br>${adresse_normalisee}');
${comparables.map(t=>`L.circleMarker([${t.latitude},${t.longitude}],{radius:6,fillColor:'${t.type_bien==='Maison'?'#2ecc71':'#3498db'}',color:'#fff',weight:2,fillOpacity:0.9}).addTo(map).bindPopup('Type: ${t.type_bien}<br>Surface: ${t.surface} m²<br>Prix: ${t.prix_m2} €/m²<br>Score: ${t.score}');`).join('')}
</script>
</body>
</html>`;
}

// ===============================
// Handler principal
// ===============================

export default async function handler(req,res){
  const {adresse,type_bien,surface,nb_pieces,prix,format} = req.query;
  if(!adresse) return res.status(400).json({error:"adresse manquante"});

  try{
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoData = await geoRes.json();
    if(!geoData.features || geoData.features.length===0) return res.status(404).json({error:"Adresse non trouvée"});
    const feature = geoData.features[0];
    if(feature.properties.score<0.7) return res.status(400).json({error:"Adresse imprécise"});

    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const adresse_normalisee = feature.properties.label;
    const ville = feature.properties.city;
    const code_postal = feature.properties.postcode?.trim()||"";
    const surfaceRecherche = surface?parseFloat(surface):null;
    const nbPiecesRecherche = nb_pieces?parseInt(nb_pieces):null;
    const prixBien = prix?parseFloat(prix):null;

    const deltaLat=0.007, deltaLon=0.01;
    const SUPABASE_URL=process.env.SUPABASE_URL;
    const SUPABASE_KEY=process.env.SUPABASE_KEY;

    let url = `${SUPABASE_URL}/rest/v1/transactions?latitude=gte.${lat-deltaLat}&latitude=lte.${lat+deltaLat}&longitude=gte.${lon-deltaLon}&longitude=lte.${lon+deltaLon}&select=date_mutation,type_bien,surface,valeur_fonciere,prix_m2,nb_pieces,prix_median_section,latitude,longitude`;
    if(type_bien) url+=`&type_bien=eq.${encodeURIComponent(type_bien)}`;
    const supaRes = await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    const transactions = await supaRes.json();
    if(!transactions||transactions.length===0) return res.status(404).json({error:"Aucune transaction trouvée"});

    const filtered = transactions.map(t=>{
      const distanceKm=haversine(lat,lon,t.latitude,t.longitude);
      return {...t,distance_km:distanceKm,distance_m:Math.round(distanceKm*1000)};
    }).filter(t=>t.distance_m<=500 && t.prix_m2);
    if(filtered.length===0) return res.status(404).json({error:"Aucune transaction à 500m"});

    // Analyse marché
    const prixM2List = filtered.map(t=>t.prix_m2).sort((a,b)=>a-b);
    const median = percentile(prixM2List,50);
    const p25 = percentile(prixM2List,25);
    const p75 = percentile(prixM2List,75);
    const mean = prixM2List.reduce((a,b)=>a+b,0)/prixM2List.length;
    const variance = prixM2List.reduce((s,v)=>s+Math.pow(v-mean,2),0)/prixM2List.length;
    const ecartType = Math.sqrt(variance);
    const dispersionPct = (ecartType/mean)*100;

    let fiabilite=filtered.length>=20?"Analyse fiable":filtered.length>=8?"Analyse solide":"Analyse indicative";
    const oneYearAgo=new Date();oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
    const ventes12mois=filtered.filter(t=>new Date(t.date_mutation)>oneYearAgo).length;
    const tension = ventes12mois>15?"Marché dynamique":ventes12mois>7?"Marché équilibré":"Marché calme";

    let analyseBien = null;
    if(prixBien && surfaceRecherche){
      const prixM2Bien=prixBien/surfaceRecherche;
      const ecartPctBien = ((prixM2Bien-median)/median)*100;
      const verdict = ecartPctBien<=-8?"Bonne affaire":ecartPctBien<=5?"Prix cohérent":ecartPctBien<=12?"Légèrement cher":"Surévalué";
      analyseBien={prix_bien_m2:Math.round(prixM2Bien),ecart_pct:Math.round(ecartPctBien*10)/10,verdict,prix_recommande:Math.round(median*surfaceRecherche),fourchette_basse:Math.round(p25*surfaceRecherche),fourchette_haute:Math.round(p75*surfaceRecherche)};
    }

    const prixMedianSection=median;
    const comparables = filtered.map(t=>({...t,score:scoreTransaction(t,t.distance_km,surfaceRecherche,nbPiecesRecherche,prixMedianSection)})).sort((a,b)=>b.score-a.score).slice(0,15);

    const responseData={success:true,adresse_normalisee,ville,code_postal,marche:{median_m2:Math.round(median),dispersion:dispersionPct<8?"Marché homogène":"Marché hétérogène",fiabilite,tension},analyse_bien,comparables,nb_transactions:filtered.length};

    if(format==="html"){
      const html = generateHTML(responseData,lat,lon,surfaceRecherche,nbPiecesRecherche);
      res.setHeader("Content-Type","text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    return res.status(200).json(responseData);

  }catch(e){
    return res.status(500).json({error:e.message});
  }
}
