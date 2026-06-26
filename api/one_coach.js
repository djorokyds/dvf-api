const { GoogleGenAI } = require('@google/genai');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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
      previous_question,
      previous_answer,
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
Tu es ONE Coach, le coach financier personnel de Fi-One.

Tu n'écris pas un rapport.
Tu parles comme un coach humain.
Tu es sobre, premium, bienveillant, concret et orienté action.

STYLE :
- humain
- direct mais jamais culpabilisant
- motivant
- simple
- premium
- pas de jargon
- pas de longues listes
- pas de ton robotique

RÈGLE SUR LES CHIFFRES :
Tu dois intégrer naturellement 2 à 4 chiffres clés dans le message.
Tu ne dois pas seulement citer les chiffres : tu dois expliquer ce qu'ils signifient.
Exemples :
- "Avec 15 000 € d'épargne disponible, tu as déjà une vraie base d'apport."
- "Ton taux d'endettement à 12 % te laisse une marge confortable."
- "Ton épargne moyenne de 650 € par mois montre une discipline réelle."

MODULES FI-ONE DISPONIBLES :
- Module budget
- Module épargne
- Module dettes
- Simulateur immobilier
- Simulateur capacité d'emprunt
- Formation achat immobilier
- Formation gestion financière

RÈGLE MODULE :
Tu dois recommander UN seul module Fi-One adapté à la situation.
Ne recommande pas toujours l'immobilier.
Si l'utilisateur parle d'achat, de bien, d'apport ou de prix : Simulateur immobilier.
Si l'utilisateur parle de mensualité ou capacité : Simulateur capacité d'emprunt.
Si les dépenses sont floues : Module budget.
Si le sujet est l'épargne ou l'apport : Module épargne.
Si le sujet est crédit, dette, auto, conso : Module dettes.
Si l'utilisateur veut apprendre : une formation.

HISTORIQUE RÉCENT :
Dernière question : ${previous_question || 'aucune'}
Dernière réponse : ${previous_answer || 'aucune'}

CONTEXTE :
${contexte}

DEMANDE UTILISATEUR :
${message || 'Prépare mon rendez-vous ONE Coach du jour.'}

FORMAT JSON STRICT :
{
  "mood": "encouragement|challenge|pédagogie|projection|célébration",
  "phrase_choc": "phrase forte et personnalisée",
  "message_coach": "message naturel de coach en 6 à 9 phrases avec chiffres intégrés",
  "ce_qui_me_rassure": ["maximum 2 éléments"],
  "ce_qui_me_freine": "un seul frein principal",
  "priorite_du_moment": {
    "titre": "titre court",
    "action": "action concrète",
    "pourquoi": "raison simple"
  },
  "module_recommande": {
    "nom": "nom exact du module",
    "raison": "pourquoi ce module est pertinent",
    "action": "ce que l'utilisateur doit faire dans ce module"
  },
  "pensee_finale": "phrase finale inspirante ou question douce"
}
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const raw = result.text.replace(/```json|```/g, '').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        mood: 'encouragement',
        phrase_choc: 'Tu avances, mais il faut maintenant clarifier la prochaine étape.',
        message_coach: raw,
        ce_qui_me_rassure: [],
        ce_qui_me_freine: 'Il manque encore quelques données pour être plus précis.',
        priorite_du_moment: {
          titre: 'Clarifier ta situation',
          action: 'Complète les informations financières manquantes.',
          pourquoi: 'Plus les données sont claires, plus le coaching devient utile.',
        },
        module_recommande: {
          nom: 'Formation gestion financière',
          raison: 'Pour consolider les bases avant d’aller plus loin.',
          action: 'Commence par revoir les fondamentaux de ton budget et de ton épargne.',
        },
        pensee_finale: 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
      };
    }

    const moodLabel = {
      encouragement: 'Encouragement',
      challenge: 'Challenge',
      pédagogie: 'Pédagogie',
      projection: 'Projection',
      célébration: 'Célébration',
    }[data.mood] || 'Rendez-vous';

    const safe = {
      moodLabel: escapeHtml(moodLabel),
      phrase: escapeHtml(data.phrase_choc),
      message: escapeHtml(data.message_coach),
      rassure: Array.isArray(data.ce_qui_me_rassure) ? data.ce_qui_me_rassure.map(escapeHtml) : [],
      freine: escapeHtml(data.ce_qui_me_freine),
      prioriteTitre: escapeHtml(data.priorite_du_moment?.titre),
      prioriteAction: escapeHtml(data.priorite_du_moment?.action),
      prioritePourquoi: escapeHtml(data.priorite_du_moment?.pourquoi),
      moduleNom: escapeHtml(data.module_recommande?.nom),
      moduleRaison: escapeHtml(data.module_recommande?.raison),
      moduleAction: escapeHtml(data.module_recommande?.action),
      pensee: escapeHtml(data.pensee_finale),
    };

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
    padding: 18px;
    background: #181818;
    border-bottom: 1px solid #2A2A2A;
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
    font-weight: 900;
    font-size: 18px;
  }

  .name {
    color: #C38F5A;
    font-size: 15px;
    font-weight: 800;
  }

  .sub {
    color: #777;
    font-size: 12px;
    margin-top: 2px;
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
    text-transform: uppercase;
    letter-spacing: .5px;
  }

  .card {
    background: #202020;
    border: 1px solid #2D2D2D;
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 14px;
  }

  .main-card {
    border-left: 3px solid #C38F5A;
  }

  .phrase {
    font-size: 21px;
    line-height: 1.35;
    font-weight: 850;
    margin-bottom: 14px;
    color: white;
  }

  .message {
    font-size: 15px;
    line-height: 1.7;
    color: #D8D6D2;
    white-space: pre-line;
  }

  .kicker {
    color: #C38F5A;
    font-size: 11px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 8px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    background: #1E2A20;
    border: 1px solid #2D5A38;
    color: #C8E8D0;
    padding: 8px 10px;
    border-radius: 999px;
    font-size: 13px;
    line-height: 1.4;
  }

  .frein {
    color: #E3E0DA;
    font-size: 14px;
    line-height: 1.55;
  }

  .mission {
    background: #1A1A1A;
    border-color: #3A3027;
  }

  .mission-title {
    font-size: 18px;
    font-weight: 850;
    color: white;
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
    color: white;
    margin-bottom: 5px;
  }

  .module-reason,
  .module-action {
    font-size: 13px;
    line-height: 1.5;
  }

  .module-reason { color: #AFAFAF; }
  .module-action { color: #D8D6D2; margin-top: 8px; }

  .final {
    background: #181818;
    color: #CFCBC3;
    font-size: 14px;
    line-height: 1.55;
    font-style: italic;
  }

  .chat {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .chat input {
    flex: 1;
    background: #202020;
    border: 1px solid #333;
    color: #F2F0EC;
    border-radius: 14px;
    padding: 13px 14px;
    font-size: 14px;
    outline: none;
  }

  .chat input:focus { border-color: #C38F5A; }

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
    color: #777;
    font-size: 12px;
  }

  .loading.visible { display: block; }

  .legal {
    text-align: center;
    color: #666;
    font-size: 11px;
    line-height: 1.5;
    margin-top: 18px;
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

  <section class="card main-card">
    <div class="phrase">${safe.phrase}</div>
    <div class="message" id="coachMessage">${safe.message}</div>
  </section>

  ${
    safe.rassure.length
      ? `<section class="card">
          <div class="kicker">Ce qui me rassure</div>
          <div class="chips">
            ${safe.rassure.slice(0, 2).map(item => `<div class="chip">✅ ${item}</div>`).join('')}
          </div>
        </section>`
      : ''
  }

  ${
    safe.freine
      ? `<section class="card">
          <div class="kicker">Ce qui mérite ton attention</div>
          <div class="frein">⚠️ ${safe.freine}</div>
        </section>`
      : ''
  }

  <section class="card mission">
    <div class="kicker">Mission de la semaine</div>
    <div class="mission-title">${safe.prioriteTitre}</div>
    <div class="text">${safe.prioriteAction}</div>
    <div class="muted">${safe.prioritePourquoi}</div>
  </section>

  <section class="card module-card">
    <div class="module-icon">↗</div>
    <div>
      <div class="kicker">Module conseillé</div>
      <div class="module-name">${safe.moduleNom}</div>
      <div class="module-reason">${safe.moduleRaison}</div>
      <div class="module-action">${safe.moduleAction}</div>
    </div>
  </section>

  <section class="card final">
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
  document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    const text = error.message || '';

    if (text.includes('429') || text.includes('RESOURCE_EXHAUSTED') || text.includes('quota')) {
      return res.status(429).send(`
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:28px;background:#151515;color:white;min-height:100vh">
          <h2 style="color:#C38F5A;margin-bottom:16px">ONE Coach revient dans quelques secondes</h2>
          <p style="font-size:18px;color:#eee">Le coach a reçu trop de demandes en peu de temps.</p>
          <p style="font-size:18px;color:#aaa">Nouvelle tentative automatique dans :</p>
          <div id="countdown" style="font-size:48px;font-weight:800;color:#C38F5A;margin:24px 0">40</div>
          <p style="font-size:14px;color:#777">La page se relancera automatiquement.</p>

          <script>
            let seconds = 40;
            const el = document.getElementById('countdown');

            const timer = setInterval(() => {
              seconds -= 1;
              el.textContent = seconds;

              if (seconds <= 0) {
                clearInterval(timer);
                window.location.reload();
              }
            }, 1000);
          </script>
        </div>
      `);
    }

    return res.status(500).json({ error: error.message });
  }
};
