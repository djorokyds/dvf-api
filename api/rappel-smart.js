module.exports = async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  const googleCalendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=%F0%9F%92%B0+Fi-One+%E2%80%94+Saisis+tes+d%C3%A9penses+!' +
    '&details=Ton+budget+du+mois+t%27attend.+2+minutes+suffisent+pour+rester+sur+la+bonne+voie+%F0%9F%8E%AF%0AOuvrir+Fi-One+%3A+https%3A%2F%2Ffi-one.glide.page' +
    '&recur=RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DMO' +
    '&dates=20260401T190000%2F20260401T191500';

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fi-One//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:fi-one-budget-rappel@fi-one
DTSTART;TZID=Europe/Paris:20260401T190000
DTEND;TZID=Europe/Paris:20260401T191500
RRULE:FREQ=WEEKLY;BYDAY=MO
SUMMARY:💰 Fi-One — Saisis tes dépenses !
DESCRIPTION:Ton budget du mois t'attend.\n2 minutes suffisent pour rester sur la bonne voie 🎯\nOuvrir Fi-One : https://fi-one.glide.page
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Rappel Fi-One
END:VALARM
END:VEVENT
END:VCALENDAR`;

  if (isIOS) {
    // webcal:// ouvre directement l'app Calendrier iOS sans passer par Safari/WebView
    const webcalUrl = 'webcal://dvf-api-flame.vercel.app/api/rappel';
    return res.redirect(302, webcalUrl);
  } else {
    return res.redirect(302, googleCalendarUrl);
  }
};
