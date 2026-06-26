function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCoachMessage(message = '') {
  return escapeHtml(message)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${p.trim()}</p>`)
    .join('');
}

function renderCoachHtml(data = {}) {
  const safe = {
    intention: escapeHtml(data.intention || 'Faisons le point'),
    phrase: escapeHtml(data.phrase_choc),
    messageHtml: formatCoachMessage(data.message_coach),
    prioriteTitre: escapeHtml(data.priorite_titre),
    prioriteAction: escapeHtml(data.priorite_action),
    prioritePourquoi: escapeHtml(data.priorite_pourquoi),
    moduleNom: escapeHtml(data.module_recommande?.nom),
    moduleRaison: escapeHtml(data.module_recommande?.raison),
    moduleAction: escapeHtml(data.module_recommande?.action),
    reflection: escapeHtml(data.reflection),
  };

  return `<!DOCTYPE html>
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

  .intent {
    display: inline-block;
    margin-bottom: 12px;
    padding: 6px 11px;
    border-radius: 999px;
    background: #231D17;
    color: #C38F5A;
    font-size: 11px;
    font-weight: 800;
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
    margin-bottom: 16px;
    color: white;
  }

  .message p {
    font-size: 15px;
    line-height: 1.68;
    color: #D8D6D2;
    margin-bottom: 12px;
  }

  .message p:last-child {
    margin-bottom: 0;
  }

  .message strong,
  .message b {
    color: #F2F0EC;
    font-weight: 850;
    background: #2A2118;
    border: 1px solid #3A3027;
    padding: 1px 5px;
    border-radius: 6px;
  }

  .kicker {
    color: #C38F5A;
    font-size: 11px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 8px;
  }

  .priority {
    background: #1A1A1A;
    border-color: #3A3027;
  }

  .priority-title {
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

  .reflection {
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
  <div class="intent">${safe.intention}</div>

  <section class="card main-card">
    <div class="phrase">${safe.phrase}</div>
    <div class="message" id="coachMessage">${safe.messageHtml}</div>
  </section>

  <section class="card priority">
    <div class="kicker">Priorité du moment</div>
    <div class="priority-title">${safe.prioriteTitre}</div>
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

  ${
    safe.reflection
      ? `<section class="card reflection">${safe.reflection}</section>`
      : ''
  }

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
}

module.exports = {
  renderCoachHtml,
};
