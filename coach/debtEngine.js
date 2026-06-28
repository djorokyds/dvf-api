const { toNumber, euro } = require('./profileEngine');

function parseCredits(rawValue) {
  if (!rawValue) return [];

  return String(rawValue)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [type, mensualiteRaw, capitalRaw] = item.split(':');

      const mensualite = toNumber(mensualiteRaw);
      const capitalRestant = toNumber(capitalRaw);

      if (!type || mensualite === null) return null;

      return {
        type: type.trim(),
        mensualite,
        capitalRestant,
      };
    })
    .filter(Boolean);
}

function analyzeDebts(query) {
  const revenuNet = toNumber(query.revenu_net);
  const credits = parseCredits(query.credits);

  const totalMensualites = credits.reduce(
    (sum, credit) => sum + credit.mensualite,
    0
  );

  const totalCapitalRestant = credits.reduce(
    (sum, credit) => sum + (credit.capitalRestant || 0),
    0
  );

  const poidsMensualites =
    revenuNet && revenuNet > 0
      ? (totalMensualites / revenuNet) * 100
      : null;

  const mainCredit = [...credits].sort(
    (a, b) => b.mensualite - a.mensualite
  )[0] || null;

  const debtInsights = [];

  if (credits.length > 0) {
    debtInsights.push({
      id: 'credit_total',
      priority: 90,
      message: `Tes crédits représentent ${euro(totalMensualites)} de mensualités chaque mois.`,
    });
  }

  if (poidsMensualites !== null) {
    if (poidsMensualites >= 30) {
      debtInsights.push({
        id: 'credit_weight_high',
        priority: 95,
        message: `Tes mensualités de crédit pèsent déjà fortement dans ton budget mensuel.`,
      });
    } else if (poidsMensualites >= 15) {
      debtInsights.push({
        id: 'credit_weight_medium',
        priority: 80,
        message: `Tes crédits restent présents, mais ils ne bloquent pas forcément un nouveau projet.`,
      });
    } else {
      debtInsights.push({
        id: 'credit_weight_low',
        priority: 70,
        message: `Tes crédits actuels laissent encore une marge de manœuvre financière.`,
      });
    }
  }

  if (mainCredit) {
    debtInsights.push({
      id: 'main_credit',
      priority: 85,
      message: `Le crédit ${mainCredit.type} est aujourd’hui ton engagement mensuel le plus important avec ${euro(mainCredit.mensualite)} par mois.`,
    });
  }

  return {
    credits,
    totalMensualites,
    totalCapitalRestant,
    poidsMensualites,
    mainCredit,
    debtInsights: debtInsights.sort((a, b) => b.priority - a.priority),
  };
}

module.exports = {
  analyzeDebts,
  parseCredits,
};
