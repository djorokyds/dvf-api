const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const {
      mode,
      nom,
      objectif,
      revenu_net,
      epargne_dispo,
      epargne_bloquee,
      nb_immobilier,
      taux_endettement,
      matelas_securite,
      epargne_moyen,
      fi_score,
      revenus,
      depenses,
      epargne,
      variation_depenses,
      variation_epargne,
      autres_charges,
      nb_transactions,
      message,
    } = req.query;

    const isProfile = mode === 'profil';

    const contexte = isProfile
      ? `
PROFIL UTILISATEUR
Nom : ${nom || 'non renseigné'}
Objectif : ${objectif || 'non renseigné'}
Revenu net mensuel : ${revenu_net || 'non renseigné'} €
Épargne disponible : ${epargne_dispo || 'non renseigné'} €
Épargne bloquée : ${epargne_bloquee || 'non renseigné'} €
Nombre de biens immobiliers : ${nb_immobilier || '0'}
Taux d'endettement : ${taux_endettement || 'non renseigné'} %
Matelas de sécurité : ${matelas_securite || 'non renseigné'} €
Épargne moyenne mensuelle : ${epargne_moyen || 'non renseigné'} €
FI-Score : ${fi_score || 'non renseigné'}/100
`
      : `
ANALYSE MENSUELLE
Revenus : ${revenus || 'non renseigné'} €
Dépenses : ${depenses || 'non renseigné'} €
Épargne : ${epargne || 'non renseigné'} €
Variation dépenses : ${variation_depenses || 'non renseigné'}
Variation épargne : ${variation_epargne || 'non renseigné'}
Autres charges : ${autres_charges || 'non renseigné'}
Transactions par catégorie : ${nb_transactions || 'non renseigné'}
`;

    const prompt = `
Tu es ONE Coach, le coach financier personnel de Fi-One.

Tu n'es PAS un conseiller financier réglementé.
Tu n'écris PAS un rapport.
Tu parles comme un coach personnel qui accompagne l'utilisateur.

STYLE OBLIGATOIRE :
- Direct
- Humain
- Bienveillant
- Motivant
- Court
- Pas de jargon
- Pas de liste interminable
- Pas de répétition inutile des données
- Tu interprètes, tu ne récites pas
- Tu donnes UNE priorité principale
- Tu termines par UNE question qui pousse à l'action

RÈGLE IMPORTANTE :
Si une donnée manque, ne fais pas un long avertissement.
Dis simplement ce que cela empêche de conclure.

FORMAT JSON STRICT :
{
  "phrase_choc": "une phrase forte, personnalisée, qui résume la situation",
  "message_coach": "message court de coach en 4 à 7 phrases maximum",
  "ce_qui_me_rassure": ["maximum 2 éléments"],
  "ce_qui_me_freine": "un seul frein principal",
  "priorite_du_moment": {
    "titre": "priorité courte",
    "action": "action concrète à faire maintenant",
    "pourquoi": "raison simple"
  },
  "question_finale": "question courte qui fait réfléchir",
  "ton": "positif|alerte|encourageant"
}

CONTEXTE :
${contexte}

QUESTION UTILISATEUR :
${message || 'Fais un coaching court sur ma situation.'}
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const raw = result.text.replace(/```json|```/g, '').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = {
        phrase_choc: "Tu avances, mais il faut maintenant clarifier ta priorité.",
        message_coach: raw,
        ce_qui_me_rassure: [],
        ce_qui_me_freine: "Les données ne permettent pas encore une lecture complète.",
        priorite_du_moment: {
          titre: "Clarifier la situation",
          action: "Complète les informations financières manquantes.",
          pourquoi: "Sans cela, le coaching reste approximatif.",
        },
        question_finale: "Quelle est l’action que tu peux faire aujourd’hui ?",
        ton: "encourageant",
      };
    }

    const accent =
      data.ton === 'alerte'
        ? '#E74C3C'
        : data.ton === 'positif'
        ? '#27AE60'
        : '#C38F5A';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ONE Coach - Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #171717;
      color: #f2f2f2;
      padding-bottom: 24px;
    }

    .header {
      padding: 18px 16px;
      background: linear-gradient(135deg, #21180f, #151515);
      border-bottom: 1px solid #C38F5A33;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C38F5A, #8B5E2A);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 21px;
      flex-shrink: 0;
    }

    .name {
      font-size: 15px;
      font-weight: 800;
      color: #C38F5A;
    }

    .sub {
      font-size: 12px;
      color: #777;
      margin-top: 2px;
    }

    .container {
      padding: 16px;
      max-width: 760px;
      margin: 0 auto;
    }

    .main-card {
      background: #222;
      border: 1px solid #2f2f2f;
      border-left: 4px solid ${accent};
      border-radius: 18px;
      padding: 20px;
    }

    .phrase {
      font-size: 19px;
      line-height: 1.35;
      font-weight: 800;
      color: #fff;
      margin-bottom: 16px;
    }

    .coach-text {
      font-size: 15px;
      line-height: 1.65;
      color: #d8d8d8;
      white-space: pre-line;
    }

    .block {
      margin-top: 16px;
      background: #1c1c1c;
      border-radius: 14px;
      padding: 14px;
      border: 1px solid #2a2a2a;
    }

    .block-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #777;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      background: #263226;
      border: 1px solid #27AE6044;
      color: #bce7c6;
      padding: 8px 10px;
      border-radius: 999px;
      font-size: 13px;
      line-height: 1.4;
    }

    .frein {
      color: #ddd;
      font-size: 14px;
      line-height: 1.5;
    }

    .priority {
      margin-top: 16px;
      background: linear-gradient(135deg, #2a1e12, #201b15);
      border: 1px solid #C38F5A44;
      border-radius: 16px;
      padding: 16px;
    }

    .priority-label {
      font-size: 11px;
      color: #C38F5A;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .priority-title {
      font-size: 17px;
      font-weight: 800;
      margin-bottom: 8px;
      color: #fff;
    }

    .priority-action {
      font-size: 14px;
      color: #e5e5e5;
      line-height: 1.55;
      margin-bottom: 8px;
    }

    .priority-why {
      font-size: 13px;
      color: #9a9a9a;
      line-height: 1.5;
    }

    .question {
      margin-top: 16px;
      padding: 16px;
      border-radius: 16px;
      background: #101010;
      border: 1px solid #333;
      font-size: 15px;
      line-height: 1.5;
      color: #fff;
      font-weight: 700;
    }

    .chat {
      margin-top: 18px;
      display: flex;
      gap: 8px;
    }

    .chat input {
      flex: 1;
      background: #222;
      border: 1px solid #333;
      border-radius: 12px;
      color: #fff;
      padding: 12px;
      font-size: 14px;
      outline: none;
    }

    .chat input:focus {
      border-color: #C38F5A;
    }

    .chat button {
      background: #C38F5A;
      border: none;
      color: #171717;
      font-weight: 800;
      border-radius: 12px;
      padding: 0 16px;
      cursor: pointer;
      font-size: 16px;
    }

    .loading {
      display: none;
      margin-top: 10px;
      font-size: 12px;
      color: #777;
    }

    .loading.visible {
      display: block;
    }
  </style>
</head>

<body>
  <div class="header">
    <div class="avatar">🧠</div>
    <div>
      <div class="name">ONE Coach</div>
      <div class="sub">${isProfile ? 'Coaching de profil' : 'Coaching mensuel'} · Fi-One</div>
    </div>
  </div>

  <main class="container">
    <section class="main-card">
      <div class="phrase">${data.phrase_choc || ''}</div>
      <div class="coach-text">${data.message_coach || ''}</div>
    </section>

    ${
      data.ce_qui_me_rassure?.length
        ? `
    <section class="block">
      <div class="block-title">Ce qui me rassure</div>
      <div class="chips">
        ${data.ce_qui_me_rassure
          .slice(0, 2)
          .map((item) => `<div class="chip">✅ ${item}</div>`)
          .join('')}
      </div>
    </section>`
        : ''
    }

    ${
      data.ce_qui_me_freine
        ? `
    <section class="block">
      <div class="block-title">Ce qui te freine</div>
      <div class="frein">⚠️ ${data.ce_qui_me_freine}</div>
    </section>`
        : ''
    }

    ${
      data.priorite_du_moment?.titre
        ? `
    <section class="priority">
      <div class="priority-label">Priorité du moment</div>
      <div class="priority-title">${data.priorite_du_moment.titre}</div>
      <div class="priority-action">${data.priorite_du_moment.action}</div>
      <div class="priority-why">${data.priorite_du_moment.pourquoi}</div>
    </section>`
        : ''
    }

    ${
      data.question_finale
        ? `
    <section class="question">
      ${data.question_finale}
    </section>`
        : ''
    }

    <section class="chat">
      <input id="chatInput" type="text" placeholder="Pose une question à ONE Coach..." />
      <button id="sendBtn">→</button>
    </section>

    <div class="loading" id="loading">ONE Coach réfléchit...</div>
  </main>

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

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};
