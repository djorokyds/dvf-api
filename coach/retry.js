function extractRetrySeconds(errorText = '') {
  const match = errorText.match(/retry in ([0-9.]+)s/i);
  return match ? Math.ceil(Number(match[1])) : 40;
}

function renderRetryPage(seconds = 40) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:28px;background:#151515;color:white;min-height:100vh">
      <h2 style="color:#C38F5A;margin-bottom:16px">ONE Coach revient dans quelques secondes</h2>
      <p style="font-size:18px;color:#eee">Le coach a reçu trop de demandes en peu de temps.</p>
      <p style="font-size:18px;color:#aaa">Nouvelle tentative automatique dans :</p>
      <div id="countdown" style="font-size:48px;font-weight:800;color:#C38F5A;margin:24px 0">${seconds}</div>
      <script>
        let seconds = ${seconds};
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
  `;
}

module.exports = {
  extractRetrySeconds,
  renderRetryPage,
};
