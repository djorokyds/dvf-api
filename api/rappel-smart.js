module.exports = async function handler(req, res) {

  // -------- Prochain lundi 19h --------

  const now = new Date();
  const day = now.getDay();

  const daysUntilMonday =
    day === 1 ? 7 : (8 - day) % 7;

  const nextMonday = new Date(now);

  nextMonday.setDate(
    now.getDate() + daysUntilMonday
  );

  nextMonday.setHours(19, 0, 0, 0);

  // -------- Format UTC --------

  const pad = n =>
    String(n).padStart(2, "0");

  const formatUTC = d =>
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z";

  const start = new Date(nextMonday);
  const end = new Date(nextMonday);

  end.setMinutes(end.getMinutes() + 15);

  const dtStart = formatUTC(start);
  const dtEnd = formatUTC(end);
  const dtStamp = formatUTC(new Date());

  // -------- ICS minimal fiable --------

  const icsContent =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fi-One//FR
BEGIN:VEVENT
UID:fi-one-${Date.now()}
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
RRULE:FREQ=WEEKLY;BYDAY=MO
SUMMARY:Fi-One — Saisis tes dépenses
DESCRIPTION:Ouvrir Fi-One : https://fi-one.glide.page
END:VEVENT
END:VCALENDAR`;

  // 🔥 très important

  const buffer = Buffer.from(icsContent, "utf-8");

  res.writeHead(200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": "attachment; filename=fi-one-rappel.ics",
    "Content-Length": buffer.length,
    "Cache-Control": "no-store"
  });

  res.end(buffer);
};
