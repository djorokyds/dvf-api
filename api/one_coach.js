const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME = 'gemini-2.5-flash';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cleanJson(raw = '') {
  return String(raw)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractRetrySeconds(errorText = '') {
  const retryDelayMatch = errorText.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
  if (retryDelayMatch) return Number(retryDelayMatch[1]);

  const retryInMatch = errorText.match(/retry in ([0-9.]+)s/i);
  if (retryInMatch) return Math.ceil(Number(retryInMatch[1]));

  return 40;
}

function formatEuro(value) {
  if (!value) return '';
  const number = Number(String(value).replace(',', '.'));
  if (Number.isNaN(number)) return `${value} €`;
  return `${number.toLocaleString('fr-FR')} €`;
}

function buildContext(query) {
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
  } = query;

  if (mode === 'profil') {
    return `
PROFIL UTILISATEUR
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
`;
  }

  return `
SITUATION MENSUELLE
Revenus : ${revenus || 'non renseigné'} €
Dépenses : ${depenses || 'non renseigné'} €
Épargne : ${epargne || 'non renseigné'} €
Variation dépenses : ${variation_depenses || 'non renseigné'}
Variation épargne : ${variation_epargne || 'non renseigné'}
Autres charges : ${autres_charges || 'non renseigné'}
Transactions par catégorie : ${nb_transactions || 'non renseigné'}
`;
}

function buildPrompt(query) {
  const contexte = buildContext(query);

  return `
Tu es ONE Coach, le mentor financier personnel de l'application Fi-One.

Tu n'es pas un assistant généraliste.
Tu n'es pas un conseiller financier réglementé.
Tu es un coach financier personnel, humain, sobre et premium.

MISSION DE ONE COACH :
Aider l'utilisateur à faire le prochain bon pas.
Ne pas faire un rapport.
Ne pas réciter les chiffres.
Interpréter les chiffres avec pédagogie.
Orienter l'utilisateur vers le bon module Fi-One.

STYLE :
- humain
- sobre
- premium
- direct
- encourageant
- jamais culpabilisant
- jamais trop long
- jamais robotique
- pas de jargon
- pas de longue liste

RÈGLE SUR LES CHIFFRES :
Tu dois intégrer naturellement 2 à 4 chiffres clés dans le message principal.
Les chiffres doivent renforcer le coaching.
Tu dois expliquer ce qu'ils signifient.
Ne fais pas de tableau.
Ne crée pas de carte séparée de chiffres.

Exemples :
- "Avec 15 000 € d'épargne disponible, tu as déjà une vraie base d'apport."
- "Ton taux d'endettement à 12 % te laisse une marge confortable."
- "Ton épargne moyenne de 650 € par mois montre une vraie discipline."
- "Ton matelas de sécurité de 6 000 € est utile, mais il doit rester protégé."

MODULES FI-ONE DISPONIBLES :
- Module budget : comprendre ses dépenses, réduire ses charges, organiser son budget mensuel.
- Module épargne : construire un apport, renforcer un matelas de sécurité, structurer son effort d'épargne.
- Module dettes : suivre ses crédits, réduire son endettement, arbitrer entre remboursement et épargne.
- Simulateur immobilier : tester un achat, un budget de bien, un apport, des frais de notaire, une mensualité ou un projet locatif.
- Simulateur capacité d'emprunt : estimer combien l'utilisateur peut emprunter selon ses revenus, charges et endettement.
- Formation achat immobilier : comprendre les étapes d'un achat, le financement, les frais, la banque et le notaire.
- Formation gestion financière : améliorer les bases financières et les bons réflexes.

RÈGLE MODULE :
Tu dois recommander UN seul module Fi-One.
Le module doit dépendre de la question ou de la situation.
Ne recommande pas toujours l'immobilier.
Si l'utilisateur parle d'un prix de bien, d'achat ou d'apport : Simulateur immobilier.
S'il parle de mensualité, capacité ou emprunt : Simulateur capacité d'emprunt.
S'il parle de dépenses ou budget flou : Module budget.
S'il parle d'épargne, apport ou matelas : Module épargne.
S'il parle de crédits, dette, auto, conso : Module dettes.
S'il veut apprendre : une formation.

HISTORIQUE RÉCENT :
Dernière question : ${query.previous_question || 'aucune'}
Dernière réponse : ${query.previous_answer || 'aucune'}

CONTEXTE :
${contexte}

DEMANDE UTILISATEUR :
${query.message || 'Prépare mon rendez-vous ONE Coach du jour.'}

FORMAT JSON STRICT :
{
  "mood": "encouragement|challenge|pédagogie|projection|célébration",
  "salutation": "phrase courte personnalisée",
  "message_principal": "message naturel de coach en 6 à 9 phrases maximum avec 2 à 4 chiffres intégrés naturellement",
  "mission_titre": "titre court",
  "mission": "mission concrète à faire cette semaine",
  "pourquoi": "raison simple et motivante",
  "module_recommande": {
    "nom": "nom exact du module Fi-One",
    "raison": "pourquoi ce module est utile maintenant",
    "action": "ce que l'utilisateur doit faire dans ce module"
  },
  "continuite": "phrase courte liée à l'historique si utile, sinon vide",
  "pensee_finale": "phrase finale inspirante ou question douce",
  "cta": "invitation courte"
}
`;
}

function fallbackData(raw = '') {
  return {
    mood: 'encouragement',
    salutation: 'Bonjour.',
    message_principal: raw || 'Je n’ai pas pu structurer complètement ma réponse, mais l’idée reste simple : avançons avec une action concrète.',
    mission_titre: 'Clarifier la prochaine étape',
    mission: 'Choisis une action financière simple à mettre en place cette semaine.',
    pourquoi: 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
    module_recommande: {
      nom: 'Formation gestion financière',
      raison: 'Pour renforcer les bases avant d’aller plus loin.',
      action: 'Commence par le module qui t’aide à mieux lire ta situation.',
    },
    continuite: '',
    pensee_finale: 'L’important n’est pas d’aller vite, mais d’avancer avec constance.',
    cta: 'Continuer avec ONE Coach',
  };
}


function renderCoachHtml(data, query) {
  const moodLabel = {
    encouragement: 'Encouragement',
    challenge: 'Challenge',
    pédagogie: 'Pédagogie',
    projection: 'Projection',
    célébration: 'Célébration',
  }[data.mood] || 'Rendez-vous';

  const safe = {
    moodLabel: escapeHtml(moodLabel),
    salutation: escapeHtml(data.salutation),
    message: escapeHtml(data.message_principal),
    missionTitre: escapeHtml(data.mission_titre),
    mission: escapeHtml(data.mission),
    pourquoi: escapeHtml(data.pourquoi),
    moduleNom: escapeHtml(data.module_recommande?.nom),
    moduleRaison: escapeHtml(data.module_recommande?.raison),
    moduleAction: escapeHtml(data.module_recommande?.action),
    continuite: escapeHtml(data.continuite),
    pensee: escapeHtml(data.pensee_finale),
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ONE Coach - Fi-One</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #151515;
      color: #F2F0EC;
      padding-bottom: 28px;
    }

    .header {
      padding: 18px;
      border-bottom: 1px solid #2A2A2A;
      background: #181818;
    }

    .topline {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: #C38F5A;
      color: #151515;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
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
      max-width: 760px;
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
      font-weight: 800;
      letter-spacing: .5px;
      text-transform: uppercase;
    }

    .coach-card,
    .mission-card,
    .module-card,
    .final-card {
      background: #202020;
      border: 1px solid #2D2D2D;
      border-radius: 20px;
    }

    .coach-card {
      padding: 21px;
      border-left: 3px solid #C38F5A;
    }

    .salutation {
      font-size: 21px;
      line-height: 1.35;
      font-weight: 850;
      margin-bottom: 14px;
      color: #FFFFFF;
    }

    .message {
      font-size: 15px;
      line-height: 1.7;
      color: #D8D6D2;
      white-space: pre-line;
    }

    .mission-card {
      margin-top: 14px;
      padding: 18px;
      background: #1A1A1A;
      border-color: #3A3027;
    }

    .kicker {
      font-size: 11px;
      color: #C38F5A;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .8px;
      margin-bottom: 8px;
    }

    .mission-title {
      font-size: 18px;
      font-weight: 850;
      color: #FFFFFF;
      margin-bottom: 8px;
    }

    .text {
      font-size: 14px;
      line-height: 1.55;
      color: #E3E0DA;
    }

    .muted {
      margin-top: 9px;
      font-size: 13px;
      line-height: 1.5;
      color: #9C9C9C;
    }

    .module-card {
      margin-top: 14px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #1D1D1D;
    }

    .module-icon {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      background: #25201B;
      color: #C38F5A;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 17px;
    }

    .module-name {
      font-size: 15px;
      font-weight: 850;
      color: #FFFFFF;
      margin-bottom: 5px;
    }

    .module-reason,
    .module-action {
      font-size: 13px;
      line-height: 1.5;
    }

    .module-reason {
      color: #AFAFAF;
    }

    .module-action {
      margin-top: 8px;
      color: #D8D6D2;
    }

    .continuity {
      margin-top: 14px;
      font-size: 13px;
      color: #8C8C8C;
      line-height: 1.5;
    }

    .final-card {
      margin-top: 14px;
      padding: 16px;
      background: #181818;
      color: #CFCBC3;
      font-size: 14px;
      line-height: 1.55;
      font-style: italic;
    }

    .chat {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }

    .chat input {
      flex: 1;
      background: #202020;
      border: 1px solid #333333;
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
      color: #777777;
    }

    .loading.visible {
      display: block;
    }

    .legal {
      margin-top: 18px;
      text-align: center;
      font-size: 11px;
      color: #666666;
      line-height: 1.5;
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
    <div class="badge">${safe.moodLabel}</div>

    <section class="coach-card">
      <div class="salutation">${safe.salutation}</div>
      <div class="message" id="coachMessage">${safe.message}</div>
    </section>

    <section class="mission-card">
      <div class="kicker">Mission de la semaine</div>
      <div class="mission-title">${safe.missionTitre}</div>
      <div class="text">${safe.mission}</div>
      <div class="muted">${safe.pourquoi}</div>
    </section>

    <section class="module-card">
      <div class="module-icon">↗</div>
      <div>
        <div class="kicker">Module conseillé</div>
        <div class="module-name">${safe.moduleNom}</div>
        <div class="module-reason">${safe.moduleRaison}</div>
        <div class="module-action">${safe.moduleAction}</div>
      </div>
    </section>

    ${
      safe.continuite
        ? `<div class="continuity">${safe.continuite}</div>`
        : ''
    }

    <section class="final-card">
      ${safe.pensee}
    </section>

    <section class="chat">
      <input id="chatInput" type="text" placeholder="Répondre à ONE Coach..." />
      <button id="sendBtn">→</button>
    </section>

    <div id="loading" class="loading">ONE Coach prépare sa réponse...</div>

    <div class="legal">
      ONE Coach n'est pas un conseiller financier réglementé.<br />
      Ses recommandations sont basées sur les informations partagées.
    </div>
  </main>

  <script>
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams(window.location.search);

    function sendMessage() {
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();

      if (!msg) return;

      const currentQuestion = params.get('message') || '';
      const currentAnswer = document.getElementById('coachMessage')?.innerText || '';

      params.set('previous_question', currentQuestion);
      params.set('previous_answer', currentAnswer.slice(0, 900));
      params.set('message', msg);

      input.disabled = true;
      document.getElementById('loading').classList.add('visible');

      window.location.href = baseUrl + '?' + params.toString();
    }

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>`;
}
