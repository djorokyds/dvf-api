function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMarkdownText(value = '') {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function formatCoachMessage(message = '') {
  return formatMarkdownText(message)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');
}

function renderCoachHtml(data = {}) {
  const reassurance = Array.isArray(data.ce_qui_me_rassure)
    ? data.ce_qui_me_rassure
    : [];

  const safe = {
    intention: escapeHtml(data.intention || 'Faisons le point'),
    phrase: escapeHtml(data.phrase_choc),
    messageHtml: formatCoachMessage(data.message_coach),
    reassurance: reassurance.slice(0, 2).map(formatMarkdownText),
    friction: formatMarkdownText(data.ce_qui_te_freine),
    prioriteTitre: escapeHtml(data.priorite_titre),
    prioriteAction: formatMarkdownText(data.priorite_action),
    prioritePourquoi: formatMarkdownText(data.priorite_pourquoi),
    moduleNom: escapeHtml(data.module_recommande?.nom),
    moduleRaison: formatMarkdownText(data.module_recommande?.raison),
    moduleAction: formatMarkdownText(data.module_recommande?.action),
    reflection: formatMarkdownText(data.reflection),
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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #151515;
    color: #F2F0EC;
    padding-bottom: 28px;
    opacity: 0;
    animation: pageIn .35s ease forwards;
  }

  @keyframes pageIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
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
    letter-spacing: .4px;
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
    font-weight: 800;
    margin-bottom: 17px;
    color: #FFFFFF;
  }

  .message p {
    font-size: 15px;
    line-height: 1.7;
    color: #D8D6D2;
    margin-bottom: 14px;
  }

  .message p:last-child { margin-bottom: 0; }

  strong {
    color: #F3D2AD;
    font-weight: 750;
  }

  .kicker {
    color: #C38F5A;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 9px;
  }

  .reassurance-list {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .reassurance-item {
    background: #1E2A20;
    border: 1px solid #31543A;
    color: #C9E5CE;
    padding: 9px 12px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.45;
  }

  .friction-card { background: #1D1D1D; }

  .friction-text {
    font-size: 14px;
    line-height: 1.6;
    color: #E5DED5;
  }

  .priority {
    background: #1A1A1A;
    border-color: #3A3027;
  }

  .priority-title {
    font-size: 18px;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 9px;
  }

  .text {
    font-size: 14px;
    line-height: 1.6;
    color: #E3E0DA;
  }

  .muted {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.55;
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
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 6px;
  }

  .module-reason,
  .module-action {
    font-size: 13px;
    line-height: 1.55;
  }

  .module-reason { color: #AFAFAF; }
  .module-action { color: #D8D6D2; margin-top: 8px; }

  .reflection {
    background: #181818;
    color: #CFCBC3;
    font-size: 14px;
    line-height: 1.6;
    font-style: italic;
  }

  .actions {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .monthly-button {
    width: 100%;
    border: 1px solid #3A3027;
    background: transparent;
    color: #CFA06E;
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .monthly-button:hover { background: #1F1B17; }

  .chat {
    display: flex;
    gap: 8px;
  }

  .chat input {
    flex: 1;
    min-width: 0;
    background: #202020;
    border: 1px solid #333333;
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
    padding: 0 17px;
    font-weight: 900;
    font-size: 16px;
    cursor: pointer;
  }

  .legal {
    text-align: center;
    color: #666666;
    font-size: 11px;
    line-height: 1.5;
    margin-top: 18px;
  }

  .loading-screen {
    position: fixed;
    inset: 0;
    background: #151515;
    z-index: 999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 22px;
  }

  .loading-screen.visible { display: flex; }

  .loading-card {
    width: 100%;
    max-width: 420px;
    background: #1B1B1B;
    border: 1px solid #2D2D2D;
    border-radius: 24px;
    padding: 26px;
    text-align: center;
  }

  .loading-logo {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    background: #C38F5A;
    color: #151515;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    margin: 0 auto 14px;
  }

  .loading-title {
    color: #C38F5A;
    font-weight: 800;
    font-size: 15px;
  }

  .loading-main {
    margin-top: 14px;
    font-size: 19px;
    font-weight: 800;
    color: white;
  }

  .loading-sub {
    margin-top: 8px;
    font-size: 13px;
    color: #9C9C9C;
    line-height: 1.5;
  }

  .steps {
    margin-top: 22px;
    text-align: left;
    display: grid;
    gap: 11px;
  }

  .step {
    font-size: 13px;
    color: #777;
    display: flex;
    gap: 9px;
    align-items: center;
  }

  .step.active { color: #F2F0EC; }
  .step.done { color: #C9E5CE; }

  .loader-line {
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: #2A2A2A;
    margin-top: 22px;
  }

  .loader-line::before {
    content: "";
    display: block;
    width: 42%;
    height: 100%;
    border-radius: inherit;
    background: #C38F5A;
    animation: loadingMove 1.4s ease-in-out infinite;
  }

  @keyframes loadingMove {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(260%); }
  }

  .timer-label {
    margin-top: 18px;
    font-size: 11px;
    color: #777;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  .timer {
    margin-top: 4px;
    font-size: 22px;
    font-weight: 800;
    color: #F2F0EC;
  }

  .loading-note {
    margin-top: 16px;
    font-size: 12px;
    line-height: 1.5;
    color: #777;
  }
</style>
</head>

<body>
<div class="loading-screen" id="loadingScreen">
  <div class="loading-card">
    <div class="loading-logo">1</div>
    <div class="loading-title">ONE Coach</div>
    <div class="loading-main">Préparation de ton analyse</div>
    <div class="loading-sub">ONE Coach relie tes chiffres à leur impact concret.</div>

    <div class="steps">
      <div class="step active" data-step="0">🟢 Compréhension de ta situation</div>
      <div class="step" data-step="1">⚪ Analyse de tes finances</div>
      <div class="step" data-step="2">⚪ Recherche des points clés</div>
      <div class="step" data-step="3">⚪ Préparation des recommandations</div>
      <div class="step" data-step="4">⚪ Rédaction de ton analyse</div>
    </div>

    <div class="loader-line"></div>

    <div class="timer-label">Temps d'analyse</div>
    <div class="timer" id="timer">00:00</div>

    <div class="loading-note" id="loadingNote">
      Chaque analyse est personnalisée selon ta situation.
    </div>
  </div>
</div>

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

  ${
    safe.reassurance.length
      ? `<section class="card reassurance-card">
          <div class="kicker">Ce qui me rassure</div>
          <div class="reassurance-list">
            ${safe.reassurance.map((item) => `<div class="reassurance-item">✅ ${item}</div>`).join('')}
          </div>
        </section>`
      : ''
  }

  ${
    safe.friction
      ? `<section class="card friction-card">
          <div class="kicker">Ce qui te freine</div>
          <div class="friction-text">⚠️ ${safe.friction}</div>
        </section>`
      : ''
  }

  <section class="card priority">
    <div class="kicker">Priorité du moment</div>
    <div class="priority-title">${safe.prioriteTitre}</div>
    <div class="text">${safe.prioriteAction}</div>
    <div class="muted">${safe.prioritePourquoi}</div>
  </section>

  <section class="card module-card">
    <div class="module-icon">↗️</div>
    <div>
      <div class="kicker">Module conseillé</div>
      <div class="module-name">${safe.moduleNom}</div>
      <div class="module-reason">${safe.moduleRaison}</div>
      <div class="module-action">${safe.moduleAction}</div>
    </div>
  </section>

  ${safe.reflection ? `<section class="card reflection">${safe.reflection}</section>` : ''}

  <section class="actions">
    <button type="button" class="monthly-button" id="monthlyBtn">
      Analyser le mois en cours
    </button>

    <div class="chat">
      <input id="chatInput" type="text" placeholder="Répondre à ONE Coach..." />
      <button type="button" id="sendBtn">→</button>
    </div>
  </section>

  <div class="legal">
    ONE Coach n'est pas un conseiller financier réglementé.<br />
    Ses recommandations sont basées sur les informations partagées.
  </div>
</main>

<script>
  const baseUrl = window.location.href.split('?')[0];
  const params = new URLSearchParams(window.location.search);

  let timerInterval;
  let seconds = 0;

  const notes = [
    "Chaque analyse est personnalisée selon ta situation.",
    "Le coach relie tes chiffres à leur impact concret.",
    "Les recommandations tiennent compte de ton projet.",
    "ONE Coach prépare la prochaine décision utile."
  ];

  function formatTime(value) {
    const m = String(Math.floor(value / 60)).padStart(2, '0');
    const s = String(value % 60).padStart(2, '0');
    return m + ':' + s;
  }

  function updateSteps() {
    const steps = document.querySelectorAll('.step');
    const index = Math.min(Math.floor(seconds / 2), steps.length - 1);

    steps.forEach((step, i) => {
      step.classList.remove('active', 'done');

      if (i < index) {
        step.classList.add('done');
        step.innerHTML = '✅ ' + step.innerText.replace(/^🟢 |^⚪ |^✅ /, '');
      } else if (i === index) {
        step.classList.add('active');
        step.innerHTML = '🟢 ' + step.innerText.replace(/^🟢 |^⚪ |^✅ /, '');
      } else {
        step.innerHTML = '⚪ ' + step.innerText.replace(/^🟢 |^⚪ |^✅ /, '');
      }
    });

    document.getElementById('loadingNote').innerText =
      notes[Math.min(Math.floor(seconds / 3), notes.length - 1)];
  }

  function showLoading() {
    document.getElementById('loadingScreen').classList.add('visible');

    seconds = 0;
    document.getElementById('timer').innerText = formatTime(seconds);
    updateSteps();

    timerInterval = setInterval(() => {
      seconds += 1;
      document.getElementById('timer').innerText = formatTime(seconds);
      updateSteps();
    }, 1000);
  }

  function saveConversationContext() {
    const currentQuestion = params.get('message') || '';
    const currentAnswer = document.getElementById('coachMessage')?.innerText || '';

    params.set('previous_question', currentQuestion);
    params.set('previous_answer', currentAnswer.slice(0, 900));
  }

  function navigateWithParams() {
    window.location.href = baseUrl + '?' + params.toString();
  }

  function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    saveConversationContext();
    params.set('message', message);

    showLoading();
    setTimeout(navigateWithParams, 300);
  }

  function analyzeCurrentMonth() {
    saveConversationContext();
    params.set('message', 'Analyse mon mois en cours');

    showLoading();
    setTimeout(navigateWithParams, 300);
  }

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('monthlyBtn').addEventListener('click', analyzeCurrentMonth);

  document.getElementById('chatInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') sendMessage();
  });
</script>
</body>
</html>`;
}

module.exports = {
  renderCoachHtml,
};
