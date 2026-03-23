module.exports = async function handler(req, res) {

  // -------- Date prochain lundi 19h --------

  const now = new Date();
  const day = now.getDay(); // 0=dimanche

  const daysUntilMonday =
    day === 1 ? 7 : (8 - day) % 7;

  const nextMonday = new Date(now);

  nextMonday.setDate(
    now.getDate() + daysUntilMonday
  );

  nextMonday.setHours(19, 0, 0, 0);

  // -------- Format UTC obligatoire --------

  const pad = n =>
    String(n).padStart(2, "0");

  const formatUTC = date =>
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z";

  const start = new Date(nextMonday);
  const end = new Date(nextMonday);

  end.setMinutes(
    end.getMinutes() + 15
  );

  const dtStart = formatUTC(start);
  const dtEnd = formatUTC(end);
  const dtStamp = formatUTC(new Date());

  // -------- ICS propre iOS compatible --------

  const icsContent =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fi-One//FR
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:fi-one-budget-rappel@fi-one
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
RRULE:FREQ=WEEKLY;BYDAY=MO
SUMMARY:💰 Fi-One — Saisis tes dépenses !
DESCRIPTION:Ton budget du mois t'attend.\\n2 minutes suffisent pour rester sur la bonne voie 🎯\\nOuvrir Fi-One : https://fi-one.glide.page
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Rappel Fi-One
END:VALARM
END:VEVENT
END:VCALENDAR`;

  // -------- Headers essentiels --------

  res.setHeader(
    "Content-Type",
    "text/calendar; charset=utf-8"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fi-one-rappel.ics"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return res
    .status(200)
    .send(icsContent);
};
