module.exports = async function handler(req, res) {

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fi-One//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:fi-one-budget-rappel@fi-one
DTSTART;TZID=Europe/Paris:20260401T090000
RRULE:FREQ=MONTHLY;BYMONTHDAY=1
SUMMARY:💰 Fi-One — Saisis tes dépenses !
DESCRIPTION:Ton budget du mois t'attend.\n2 minutes suffisent pour rester sur la bonne voie 🎯\n→ Ouvrir Fi-One : https://fi-one.glide.page
DURATION:PT30M
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Rappel Fi-One
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:fi-one-dca-rappel@fi-one
DTSTART;TZID=Europe/Paris:20260415T090000
RRULE:FREQ=MONTHLY;BYMONTHDAY=15
SUMMARY:📈 Fi-One — Ton DCA mensuel !
DESCRIPTION:C'est le moment d'investir ta mensualité 🚀\n→ Ouvrir Fi-One : https://fi-one.glide.page
DURATION:PT30M
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Rappel Fi-One
END:VALARM
END:VEVENT
END:VCALENDAR`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fi-one-rappels.ics"');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(ics);
};
