const groupByMonth = (transactions) => {
  const parMois = {};
  transactions.forEach(t => {
    const date = t.date_mutation || '';
    if (date.length < 7) return;
    const mois = date.substring(0, 7);
    if (!parMois[mois]) parMois[mois] = [];
    if (t.prix_m2 > 0) parMois[mois].push(t.prix_m2);
  });
  return Object.keys(parMois)
    .sort()
    .map(mois => {
      const vals = parMois[mois].sort((a, b) => a - b);
      // Filtre IQR
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const iqr = q3 - q1;
      const filtred = vals.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
      return { mois, vals: filtred };
    })
    .filter(d => d.vals.length >= 3)
    .map(d => ({
      mois: d.mois,
      prix_median: median(d.vals),
      nb_transactions: d.vals.length
    }));
};
