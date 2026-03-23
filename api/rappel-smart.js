module.exports = async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  const googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=%F0%9F%92%B0+Fi-One+%E2%80%94+Saisis+tes+d%C3%A9penses+!' +
    '&details=Ton+budget+du+mois+t%27attend.+2+minutes+suffisent+pour+rester+sur+la+bonne+voie+%F0%9F%8E%AF%0AOuvrir+Fi-One+%3A+https%3A%2F%2Ffi-one.glide.page' +
    '&recur=RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DMO' +
    '&dates=20260401T190000%2F20260401T191500';

  if (isIOS) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel Fi-One</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #1f1f1f; color: #eaeaea; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 24px; }
    .container { max-width: 320px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 13px; color: #888; margin-bottom: 24px; line-height: 1.6; }
    .btn { display: block; background: #27ae60; color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .btn-secondary { display: block; color: #888; font-size: 12px; margin-top: 8px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📅</div>
    <h1>Activer les rappels</h1>
    <p>Chaque lundi à 19h, Fi-One te rappelle de saisir tes dépenses.</p>
    <a href="webcal://dvf-api-flame.vercel.app/api/rappel" class="btn">
      Ajouter à mon Calendrier
    </a>
    <a href="#" class="btn-secondary" onclick="window.location.href='webcal://dvf-api-flame.vercel.app/api/rappel'">
      Ouvrir avec Apple Calendrier
    </a>
  </div>
  <script>
    // Tentative auto après 800ms
    setTimeout(() => {
      window.location.href = 'webcal://dvf-api-flame.vercel.app/api/rappel';
    }, 800);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } else {
    return res.redirect(302, googleCalendarUrl);
  }
};
