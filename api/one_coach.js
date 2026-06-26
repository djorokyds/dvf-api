const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const {
    revenus, depenses, epargne,
    variation_depenses, variation_epargne,
    autres_charges, nb_transactions,
    nom, objectif,
    revenu_net, epargne_dispo, epargne_bloquee,
    nb_immobilier, taux_endettement,
    matelas_securite, epargne_moyen, fi_score,
    mode, message,
  } = req.query;

  const isProfile = mode === 'profil';

  let contexte = '';
  if (!isProfile) {
    contexte = `
ANALYSE MENSUELLE :
- Revenus : ${revenus || 'non renseigné'} €
- Dépenses : ${depenses || 'non renseigné'} €
- Épargne : ${epargne || 'non renseigné'} €
- Variation dépenses vs mois précédent : ${variation_depenses || 'non renseigné'}
- Variation épargne vs mois précédent : ${variation_epargne || 'non renseigné'}
- Autres charges : ${autres_charges || 'non renseigné'}
- Transactions par catégorie : ${nb_transactions || 'non renseigné'}
`;
  } else {
    contexte = `
PROFIL GLOBAL :
- Nom : ${nom || 'non renseigné'}
- Objectif : ${objectif || 'non renseigné'}
- Revenu net mensuel : ${revenu_net || 'non renseigné'} €
- Épargne disponible : ${epargne_dispo || 'non renseigné'} €
- Épargne bloquée : ${epargne_bloquee || 'non renseigné'} €
- Biens immobiliers : ${nb_immobilier || '0'}
- Taux d'endettement : ${taux_endettement || 'non renseigné'} %
- Matelas de sécurité : ${matelas_securite || 'non renseigné'} €
- Épargne moyenne mensuelle : ${epargne_moyen || 'non renseigné'} €
- FI-Score : ${fi_score || 'non renseigné'}/100
`;
  }

  const systemPrompt = `Tu es ONE Coach, le coach financier personnel de l'application Fi-One.
Tu aides l'utilisateur à comprendre sa situation financière, son budget, ses dettes, ses objectifs et ses priorités.
Tu ne donnes pas de conseil financier réglementé.
Tu fournis des explications claires, pédagogiques, bienveillantes et actionnables.
Tu utilises UNIQUEMENT les données fournies dans le contexte.
Tu signales les limites si les données sont insuffisantes.
Tu proposes toujours 1 à 3 actions concrètes.
Tu réponds UNIQUEMENT en JSON valide, sans markdown autour.

FORMAT JSON :
{
  "resume": "phrase courte synthétisant la situation",
  "diagnostic": "analyse (2-3 phrases)",
  "forces": ["force 1", "force 2"],
  "points_attention": ["point 1", "point 2"],
  "risques": ["risque 1"],
  "actions_recommandees": [
    {"action": "texte", "priorite": "haute|moyenne|basse"}
  ],
  "module_learning": {"titre": "nom du module", "raison": "pourquoi"},
  "score_interpretation": "interprétation du score ou situation",
  "message_motivation": "message court bienveillant",
  "et_si": {
    "hypothese": "Et si vous investissiez X€ de plus par mois ?",
    "impacts": ["impact 1", "impact 2", "impact 3"],
    "effort_quotidien": "X€ par jour"
  }
}`;

  const userMessage = message
    ? `${contexte}\n\nQuestion : ${message}`
    : `${contexte}\n\nFais une analyse complète.`;

  const fullPrompt = systemPrompt + '\n\n' + userMessage;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    
    const raw = result.text.replace(/```json|```/g, '').trim();

    let data;
    try { data = JSON.parse(raw); }
    catch (e) { data = { resume: raw, diagnostic: '', forces: [], points_attention: [], risques: [], actions_recommandees: [], message_motivation: '' }; }

    const prioriteColor = p => p === 'haute' ? '#E74C3C' : p === 'moyenne' ? '#F39C12' : '#27AE60';
    const prioriteLabel = p => p === 'haute' ? 'Priorité haute' : p === 'moyenne' ? 'Priorité moyenne' : 'À envisager';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ONE Coach - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a1a;
      color: #eaeaea;
      padding: 0 0 24px;
    }
    .coach-header {
      background: linear-gradient(135deg, #1f1f1f, #2a1f0f);
      border-bottom: 1px solid #C38F5A33;
      padding: 16px 16px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .coach-avatar {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C38F5A, #8B5E2A);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .coach-name { font-size: 14px; font-weight: 700; color: #C38F5A; }
    .coach-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .resume-box {
      margin: 14px 14px 0;
      background: #242424;
      border-radius: 12px;
      padding: 14px;
      border-left: 3px solid #C38F5A;
    }
    .resume-text { font-size: 13px; color: #eaeaea; line-height: 1.5; font-weight: 500; }
    .section { margin: 12px 14px 0; }
    .section-title {
      font-size: 10px; font-weight: 700; color: #555;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
    }
    .card {
      background: #242424; border-radius: 12px;
      padding: 14px; border: 1px solid #2a2a2a;
    }
    .card-text { font-size: 12px; color: #aaa; line-height: 1.6; }
    .list-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 6px 0; border-bottom: 1px solid #2a2a2a;
      font-size: 12px;
    }
    .list-item:last-child { border-bottom: none; padding-bottom: 0; }
    .list-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
    .action-item {
      background: #1e1e1e; border-radius: 10px;
      padding: 11px 13px; margin-bottom: 8px;
      border-left: 3px solid;
      display: flex; align-items: flex-start; gap: 10px;
    }
    .action-item:last-child { margin-bottom: 0; }
    .action-badge {
      font-size: 9px; font-weight: 700;
      padding: 2px 7px; border-radius: 20px;
      flex-shrink: 0; margin-top: 1px; white-space: nowrap;
    }
    .action-text { font-size: 12px; color: #ccc; line-height: 1.4; }
    .module-card {
      background: #1e2a1e; border-radius: 12px;
      padding: 13px 14px; border: 1px solid #27AE6044;
      display: flex; align-items: flex-start; gap: 10px;
    }
    .module-icon { font-size: 20px; flex-shrink: 0; }
    .module-title { font-size: 13px; font-weight: 700; color: #27AE60; margin-bottom: 3px; }
    .module-raison { font-size: 11px; color: #666; line-height: 1.4; }
    .etsi-card {
      background: #1f1f2e; border-radius: 12px;
      padding: 14px; border: 1px solid #5B8DD944;
    }
    .etsi-hypothese { font-size: 13px; font-weight: 700; color: #7BB8E8; margin-bottom: 10px; line-height: 1.4; }
    .etsi-impact { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; font-size: 12px; color: #aaa; line-height: 1.4; }
    .etsi-dot { color: #7BB8E8; flex-shrink: 0; font-size: 14px; margin-top: -1px; }
    .etsi-effort { margin-top: 10px; padding-top: 10px; border-top: 1px solid #2a2a3a; font-size: 11px; color: #555; font-style: italic; }
    .motivation-card {
      background: linear-gradient(135deg, #1f1a0f, #2a2210);
      border-radius: 12px; padding: 14px; border: 1px solid #C38F5A33; text-align: center;
    }
    .motivation-text { font-size: 13px; color: #C38F5A; line-height: 1.6; font-style: italic; }
    .chat-section { margin: 12px 14px 0; }
    .chat-input-wrap { display: flex; gap: 8px; align-items: center; }
    .chat-input {
      flex: 1; background: #242424; border: 1px solid #333;
      border-radius: 10px; padding: 10px 12px; font-size: 13px;
      color: #eaeaea; font-family: inherit; outline: none;
    }
    .chat-input:focus { border-color: #C38F5A66; }
    .chat-input::placeholder { color: #444; }
    .chat-btn {
      background: #C38F5A; border: none; border-radius: 10px;
      padding: 10px 16px; color: #1a1a1a; font-size: 14px;
      font-weight: 700; cursor: pointer; flex-shrink: 0;
    }
    .chat-btn:active { background: #A87A45; }
    .score-interp { font-size: 12px; color: #888; font-style: italic; line-height: 1.5; }

    /* Loading */
    .loading {
      display: none;
      text-align: center;
      padding: 12px;
      font-size: 12px;
      color: #555;
    }
    .loading.visible { display: block; }
  </style>
</head>
<body>

  <div class="coach-header">
    <div class="coach-avatar">🧠</div>
    <div>
      <div class="coach-name">ONE Coach</div>
      <div class="coach-sub">${isProfile ? 'Analyse de profil' : 'Analyse mensuelle'} · Fi-One</div>
    </div>
  </div>

  ${data.resume ? `
  <div class="resume-box">
    <div class="resume-text">${data.resume}</div>
  </div>` : ''}

  ${data.diagnostic ? `
  <div class="section">
    <div class="section-title">Diagnostic</div>
    <div class="card"><div class="card-text">${data.diagnostic}</div></div>
  </div>` : ''}

  ${data.score_interpretation ? `
  <div class="section">
    <div class="section-title">Interprétation</div>
    <div class="card"><div class="score-interp">${data.score_interpretation}</div></div>
  </div>` : ''}

  ${(data.forces?.length || data.points_attention?.length) ? `
  <div class="section">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${data.forces?.length ? `
      <div>
        <div class="section-title">✅ Forces</div>
        <div class="card" style="padding:10px 12px">
          ${data.forces.map(f => `
            <div class="list-item">
              <div class="list-dot" style="background:#27AE60"></div>
              <span style="color:#aaa;font-size:11px">${f}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
      ${data.points_attention?.length ? `
      <div>
        <div class="section-title">⚠️ Attention</div>
        <div class="card" style="padding:10px 12px">
          ${data.points_attention.map(p => `
            <div class="list-item">
              <div class="list-dot" style="background:#F39C12"></div>
              <span style="color:#aaa;font-size:11px">${p}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>` : ''}

  ${data.risques?.length ? `
  <div class="section">
    <div class="section-title">🔴 Risques</div>
    <div class="card">
      ${data.risques.map(r => `
        <div class="list-item">
          <div class="list-dot" style="background:#E74C3C"></div>
          <span style="color:#aaa;font-size:12px">${r}</span>
        </div>`).join('')}
    </div>
  </div>` : ''}

  ${data.actions_recommandees?.length ? `
  <div class="section">
    <div class="section-title">Actions recommandées</div>
    ${data.actions_recommandees.map(a => `
      <div class="action-item" style="border-color:${prioriteColor(a.priorite)}">
        <span class="action-badge" style="background:${prioriteColor(a.priorite)}22;color:${prioriteColor(a.priorite)}">
          ${prioriteLabel(a.priorite)}
        </span>
        <span class="action-text">${a.action}</span>
      </div>`).join('')}
  </div>` : ''}

  ${data.module_learning?.titre ? `
  <div class="section">
    <div class="section-title">Module Fi-One recommandé</div>
    <div class="module-card">
      <div class="module-icon">📚</div>
      <div>
        <div class="module-title">${data.module_learning.titre}</div>
        <div class="module-raison">${data.module_learning.raison}</div>
      </div>
    </div>
  </div>` : ''}

  ${data.et_si?.hypothese ? `
  <div class="section">
    <div class="section-title">Et si...</div>
    <div class="etsi-card">
      <div class="etsi-hypothese">${data.et_si.hypothese}</div>
      ${(data.et_si.impacts || []).map(i => `
        <div class="etsi-impact">
          <span class="etsi-dot">·</span>
          <span>${i}</span>
        </div>`).join('')}
      ${data.et_si.effort_quotidien ? `
        <div class="etsi-effort">Effort quotidien : ${data.et_si.effort_quotidien}</div>` : ''}
    </div>
  </div>` : ''}

  ${data.message_motivation ? `
  <div class="section">
    <div class="motivation-card">
      <div class="motivation-text">"${data.message_motivation}"</div>
    </div>
  </div>` : ''}

  <!-- Chat -->
  <div class="chat-section">
    <div class="section-title" style="margin-bottom:8px">Poser une question</div>
    <div class="chat-input-wrap">
      <input
        class="chat-input" id="chatInput" type="text"
        placeholder="Ex: Que faire avec mon épargne ?"
        onkeydown="if(event.key==='Enter') sendMessage()"
      />
      <button class="chat-btn" onclick="sendMessage()">→</button>
    </div>
    <div class="loading" id="loading">ONE Coach analyse votre question...</div>
  </div>

  <script>
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams(window.location.search);

    function sendMessage() {
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();
      if (!msg) return;
      document.getElementById('loading').classList.add('visible');
      input.disabled = true;
      params.set('message', msg);
      window.location.href = baseUrl + '?' + params.toString();
    }
  </script>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
