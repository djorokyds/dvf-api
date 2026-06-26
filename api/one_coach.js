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
PROFIL
Nom : ${nom || 'non renseigné'}
Objectif : ${objectif || 'non renseigné'}
Revenu net mensuel : ${revenu_net || 'non renseigné'} €
Épargne disponible : ${epargne_dispo || 'non renseigné'} €
Épargne bloquée : ${epargne_bloquee || 'non renseigné'} €
Biens immobiliers : ${nb_immobilier || '0'}
Taux d'endettement : ${taux_endettement || 'non renseigné'} %
Matelas de sécurité : ${matelas_securite || 'non renseigné'} €
Épargne moyenne mensuelle : ${epargne_moyen || 'non renseigné'} €
FI-Score : ${fi_score || 'non renseigné'}/100
`
      : `
SITUATION MENSUELLE
Revenus : ${revenus || 'non renseigné'} €
Dépenses : ${depenses || 'non renseigné'} €
Épargne : ${epargne || 'non renseigné'} €
Variation dépenses : ${variation_depenses || 'non renseigné'}
Variation épargne : ${variation_epargne || 'non renseigné'}
Autres charges : ${autres_charges || 'non renseigné'}
Transactions par catégorie : ${nb_transactions || 'non renseigné'}
`;

    const prompt = `
Tu es ONE Coach, le mentor financier personnel de Fi-One.

Ta mission n'est pas de faire une analyse.
Ta mission est d'accompagner l'utilisateur vers une meilleure situation financière, avec une orientation forte vers l'accès à la propriété.

Tu parles comme un coach humain.
Tu ne fais jamais de rapport.
Tu ne listes pas tout.
Tu ne culpabilises jamais.
Tu ne fais pas peur.
Tu ne récites pas les chiffres.
Tu interprètes les chiffres.

PERSONNALITÉ :
- sobre
- premium
- bienveillant
- honnête
- encourageant
- légèrement exigeant si nécessaire
- orienté action
- tourné vers l'avenir

Tu dois choisir UN seul mood :
encouragement, challenge, pédagogie, projection, célébration.

FORMAT JSON STRICT :
{
  "mood": "encouragement|challenge|pédagogie|projection|célébration",
  "salutation": "phrase courte personnalisée",
  "message_principal": "message naturel de coach en 5 à 8 phrases maximum",
  "mission_titre": "titre court de mission",
  "mission": "mission concrète à faire cette semaine",
  "pourquoi": "raison simple et motivante",
  "pensee_finale": "phrase finale inspirante, non culpabilisante",
  "cta": "texte court du bouton ou invitation"
}

RÈGLES :
- Maximum 140 mots au total.
- Ne jamais dire "diagnostic".
- Ne jamais dire "analyse".
- Ne jamais dire "risque" sauf danger évident.
- Ne jamais utiliser plus d'une mission.
- Ne termine pas toujours par une question.
- Si tu poses une question, elle doit être douce et constructive.
- Si les données sont insuffisantes, dis simplement ce que tu aimerais mieux comprendre.

CONTEXTE :
${contexte}

DEMANDE UTILISATEUR :
${message || 'Prépare mon rendez-vous ONE Coach du jour.'}
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
    });

    const raw = result.text.replace(/```json|```/g, '').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = {
        mood: 'encouragement',
        salutation: 'Bonjour.',
        message_principal: raw,
        mission_titre: 'Mission de la semaine',
        mission: 'Clarifie une action simple à mettre en place cette semaine.',
        pourquoi: 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
        pensee_finale: 'L’important n’est pas d’aller vite, mais d’avancer avec constance.',
        cta: 'Continuer avec ONE Coach',
      };
    }

    const moodLabel = {
      encouragement: 'Encouragement',
      challenge: 'Challenge',
      pédagogie: 'Pédagogie',
      projection: 'Projection',
      célébration: 'Célébration',
    }[data.mood] || 'Rendez-vous';

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
      background: #151515;
      color: #F2F0EC;
      padding-bottom: 28px;
    }

    .header {
      padding: 18px 18px 14px;
      border-bottom: 1px solid #2A2A2A;
      background: #181818;
    }

    .topline {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #C38F5A;
      color: #151515;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
    }

    .name {
      font-size: 15px;
      font-weight: 800;
      color: #C38F5A;
    }

    .sub {
      margin-top: 2px;
      font-size: 12px;
      color: #7E7E7E;
    }

    .wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 18px;
    }

    .badge {
      display: inline-block;
      margin-bottom: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      background: #231D17;
      color: #C38F5A;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .4px;
      text-transform: uppercase;
    }

    .coach-card {
      background: #202020;
      border: 1px solid #2D2D2D;
      border-radius: 20px;
      padding: 20px;
    }

    .salutation {
      font-size: 20px;
      line-height: 1.35;
      font-weight: 800;
      margin-bottom: 14px;
      color: #FFFFFF;
    }

    .message {
      font-size: 15px;
      line-height: 1.65;
      color: #D8D6D2;
      white-space: pre-line;
    }

    .mission {
      margin-top: 16px;
      padding: 18px;
      border-radius: 18px;
      background: #1A1A1A;
      border: 1px solid #3A3027;
    }

    .mission-kicker {
      font-size: 11px;
      color: #C38F5A;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .8px;
      margin-bottom: 8px;
    }

    .mission-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
      color: #FFFFFF;
    }

    .mission-text {
      font-size: 14px;
      line-height: 1.55;
      color: #E3E0DA;
      margin-bottom: 10px;
    }

    .why {
      font-size: 13px;
      line-height: 1.5;
      color: #9C9C9C;
    }

    .final {
      margin-top: 16px;
      padding: 16px;
      border-radius: 16px;
      background: #181818;
      border: 1px solid #2B2B2B;
      color: #CFCBC3;
      font-size: 14px;
      line-height: 1.55;
      font-style: italic;
    }

    .chat {
      margin-top: 18px;
      display: flex;
      gap: 8px;
    }

    .chat input {
      flex: 1;
      background: #202020;
      border: 1px solid #333;
      border-radius: 14px;
      color: #F2F0EC;
      padding: 13px 14px;
      font-size: 14px;
      outline: none;
    }

    .chat input:focus {
      border-color: #C38F5A;
    }

    .chat button {
      background: #C38F5A;
      color: #151515;
      border: none;
      border-radius: 14px;
      padding: 0 16px;
      font-weight: 900;
      font-size: 16px;
      cursor: pointer;
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
  <header class="header">
    <div class="topline">
      <div class="avatar">1</div>
      <div>
        <div class="name">ONE Coach</div>
        <div class="sub">Ton rendez-vous financier · Fi-One</div>
      </div>
    </div>
  </header>

  <main class="wrap">
    <div class="badge">${moodLabel}</div>

    <section class="coach-card">
      <div class="salutation">${data.salutation || ''}</div>
      <div class="message">${data.message_principal || ''}</div>
    </section>

    <section class="mission">
      <div class="mission-kicker">Mission de la semaine</div>
      <div class="mission-title">${data.mission_titre || ''}</div>
      <div class="mission-text">${data.mission || ''}</div>
      <div class="why">${data.pourquoi || ''}</div>
    </section>

    <section class="final">
      ${data.pensee_finale || ''}
    </section>

    <section class="chat">
      <input id="chatInput" type="text" placeholder="Répondre à ONE Coach..." />
      <button id="sendBtn">→</button>
    </section>

    <div id="loading" class="loading">ONE Coach prépare sa réponse...</div>
  </main>

  <script>
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams(window.location.search);

    function sendMessage() {
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();
      if (!msg) return;

      input.disabled = true;
      document.getElementById('loading').classList.add('visible');

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
    const errorText = error.message || '';

    if (
      errorText.includes('429') ||
      errorText.includes('RESOURCE_EXHAUSTED') ||
      errorText.includes('quota')
    ) {
      return res.status(429).send(`
        <div style="font-family:Arial;padding:24px;background:#151515;color:white;min-height:100vh">
          <h2 style="color:#C38F5A">ONE Coach revient dans quelques secondes</h2>
          <p>Le coach a reçu trop de demandes en peu de temps.</p>
          <p>Patiente quelques instants puis réessaie.</p>
        </div>
      `);
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};
