module.exports = async function handler(req, res) {

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Chargement - Fi-One</title>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    min-height: 100vh;
    background: #151515;
    color: #F2F0EC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
  }

  .card {
    width: 100%;
    max-width: 420px;
    background: #1B1B1B;
    border: 1px solid #2D2D2D;
    border-radius: 24px;
    padding: 26px;
    text-align: center;
  }

  .logo {
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

  .title {
    color: #C38F5A;
    font-weight: 800;
    font-size: 15px;
  }

  .main {
    margin-top: 14px;
    font-size: 19px;
    font-weight: 800;
    color: white;
  }

  .sub {
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

  .note {
    margin-top: 16px;
    font-size: 12px;
    line-height: 1.5;
    color: #777;
  }
</style>
</head>

<body>
  <div class="card">
    <div class="logo">1</div>
    <div class="title">ONE Coach</div>
    <div class="main">Préparation de ton analyse</div>
    <div class="sub">ONE Coach relie tes chiffres à leur impact concret.</div>

    <div class="steps">
      <div class="step active">🟢 Compréhension de ta situation</div>
      <div class="step">⚪ Analyse de tes finances</div>
      <div class="step">⚪ Recherche des points clés</div>
      <div class="step">⚪ Préparation des recommandations</div>
      <div class="step">⚪ Rédaction de ton analyse</div>
    </div>

    <div class="loader-line"></div>

    <div class="timer-label">Temps d'analyse</div>
    <div class="timer" id="timer">00:00</div>

    <div class="note" id="note">
      Chaque analyse est personnalisée selon ta situation.
    </div>
  </div>

<script>
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
      const label = step.innerText.replace(/^🟢 |^⚪ |^✅ /, '');

      step.classList.remove('active', 'done');

      if (i < index) {
        step.classList.add('done');
        step.innerText = '✅ ' + label;
      } else if (i === index) {
        step.classList.add('active');
        step.innerText = '🟢 ' + label;
      } else {
        step.innerText = '⚪ ' + label;
      }
    });

    document.getElementById('note').innerText =
      notes[Math.min(Math.floor(seconds / 3), notes.length - 1)];
  }

  setInterval(() => {
    seconds += 1;
    document.getElementById('timer').innerText = formatTime(seconds);
    updateSteps();
  }, 1000);
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
