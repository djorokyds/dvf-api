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
      taux_endettement,
      matelas_securite,
      epargne_moyen,
      fi_score,
      message,
    } = req.query;

    const contexte = `
Nom : ${nom || 'non renseigné'}
Objectif : ${objectif || 'non renseigné'}
Revenu net mensuel : ${revenu_net || 'non renseigné'} €
Épargne disponible : ${epargne_dispo || 'non renseigné'} €
Taux d'endettement : ${taux_endettement || 'non renseigné'} %
Matelas de sécurité : ${matelas_securite || 'non renseigné'} €
Épargne moyenne mensuelle : ${epargne_moyen || 'non renseigné'} €
FI-Score : ${fi_score || 'non renseigné'}/100
Question : ${message || 'Prépare mon rendez-vous ONE Coach du jour.'}
`;

    const prompt = `
Tu es ONE Coach, le coach financier personnel de Fi-One.

Tu réponds comme un coach humain, pas comme un rapport.
Tu es sobre, premium, bienveillant, concret et orienté action.
Tu intègres naturellement 2 à 4 chiffres dans ton message.
Tu recommandes un seul module Fi-One adapté.

Modules Fi-One :
- Module budget
- Module épargne
- Module dettes
- Simulateur immobilier
- Simulateur capacité d'emprunt
- Formation achat immobilier
- Formation gestion financière

Réponds uniquement en JSON valide :
{
  "mood": "encouragement|challenge|pédagogie|projection|célébration",
  "salutation": "phrase courte",
  "message": "message coach en 6 à 9 phrases avec chiffres intégrés naturellement",
  "mission_titre": "titre court",
  "mission": "mission concrète",
  "module": "module Fi-One recommandé",
  "module_action": "action à faire dans ce module",
  "pensee": "phrase finale inspirante ou question douce"
}

Contexte :
${contexte}
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
        salutation: 'Bonjour.',
        message: raw,
        mission_titre: 'Clarifier la prochaine étape',
        mission: 'Choisis une action financière simple à mettre en place cette semaine.',
        module: 'Formation gestion financière',
        module_action: 'Revoir les bases pour mieux piloter ta situation.',
        pensee: 'Un petit pas régulier vaut mieux qu’une grande décision repoussée.',
      };
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ONE Coach</title>
<style>
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #151515;
    color: #f2f0ec;
  }
  .header {
    padding: 18px;
    background: #181818;
    border-bottom: 1px solid #2a2a2a;
  }
  .name {
    color: #C38F5A;
    font-weight: 800;
    font-size: 16px;
  }
  .sub {
    color: #777;
    font-size: 12px;
    margin-top: 3px;
  }
  .wrap {
    max-width: 760px;
    margin: 0 auto;
    padding: 18px;
  }
  .badge {
    display: inline-block;
    background: #231d17;
    color: #C38F5A;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .card {
    background: #202020;
    border: 1px solid #2d2d2d;
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 14px;
  }
  .main {
    border-left: 3px solid #C38F5A;
  }
  h1 {
    font-size: 22px;
    margin: 0 0 14px;
  }
  p {
    font-size: 15px;
    line-height: 1.65;
    color: #d8d6d2;
    margin: 0;
  }
  .kicker {
    color: #C38F5A;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 8px;
  }
  .title {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .muted {
    color: #aaa;
    font-size: 14px;
    line-height: 1.5;
  }
  .chat {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }
  input {
    flex: 1;
    background: #202020;
    border: 1px solid #333;
    color: white;
    border-radius: 14px;
    padding: 13px;
    font-size: 14px;
  }
  button {
    background: #C38F5A;
    color: #151515;
    border: 0;
    border-radius: 14px;
    padding: 0 16px;
    font-weight: 900;
    cursor: pointer;
  }
  .legal {
    text-align: center;
    color: #666;
    font-size: 11px;
    margin-top: 18px;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">ONE Coach</div>
    <div class="sub">Ton rendez-vous financier · Fi-One</div>
  </div>

  <main class="wrap">
    <div class="badge">${data.mood || 'Rendez-vous'}</div>

    <section class="card main">
      <h1>${data.salutation || ''}</h1>
      <p id="coachMessage">${data.message || ''}</p>
    </section>

    <section class="card">
      <div class="kicker">Mission de la semaine</div>
      <div class="title">${data.mission_titre || ''}</div>
      <div class="muted">${data.mission || ''}</div>
    </section>

    <section class="card">
      <div class="kicker">Module conseillé</div>
      <div class="title">${data.module || ''}</div>
      <div class="muted">${data.module_action || ''}</div>
    </section>

    <section class="card">
      <p>${data.pensee || ''}</p>
    </section>

    <div class="chat">
      <input id="chatInput" placeholder="Répondre à ONE Coach..." />
      <button id="sendBtn">→</button>
    </div>

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
    params.set('message', msg);
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
        <div style="font-family:Arial;padding:28px;background:#151515;color:white;min-height:100vh">
          <h2 style="color:#C38F5A">ONE Coach revient dans quelques secondes</h2>
          <p>Le coach a reçu trop de demandes en peu de temps.</p>
          <p>Nouvelle tentative automatique dans :</p>
          <div id="countdown" style="font-size:48px;font-weight:800;color:#C38F5A;margin:24px 0">40</div>
          <script>
            let seconds = 40;
            const el = document.getElementById('countdown');
            setInterval(() => {
              seconds -= 1;
              el.textContent = seconds;
              if (seconds <= 0) window.location.reload();
            }, 1000);
          </script>
        </div>
      `);
    }

    return res.status(500).json({ error: error.message });
  }
};
