function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('€', '')
    .replace('%', '');

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function euro(value) {
  if (value === null || value === undefined) return '';
  return `${Math.round(value).toLocaleString('fr-FR')} €`;
}

function analyzeProfile(query) {
  const fiScore = toNumber(query.fi_score);
  const tauxEndettement = toNumber(query.taux_endettement);
  const epargneDispo = toNumber(query.epargne_dispo);
  const matelas = toNumber(query.matelas_securite);
  const epargneMoyen = toNumber(query.epargne_moyen);
  const revenuNet = toNumber(query.revenu_net);

  const epargneProjet =
    epargneDispo !== null && matelas !== null
      ? Math.max(0, epargneDispo - matelas)
      : null;

  let profile = 'à préciser';

  if (fiScore !== null) {
    if (fiScore >= 75) profile = 'solide';
    else if (fiScore >= 55) profile = 'intermédiaire';
    else profile = 'fragile';
  }

  const profileInsights = [];

  if (tauxEndettement !== null && tauxEndettement <= 20) {
    profileInsights.push({
      id: 'low_debt',
      priority: 95,
      message: `Avec ${tauxEndettement} % d’endettement, tu gardes une vraie marge pour financer un projet.`,
    });
  }

  if (epargneProjet !== null && epargneProjet > 0) {
    profileInsights.push({
      id: 'project_savings',
      priority: 90,
      message: `${euro(epargneProjet)} sont déjà mobilisables pour tes projets, sans toucher à ton matelas de sécurité.`,
    });
  }

  if (matelas !== null && matelas > 0) {
    profileInsights.push({
      id: 'emergency_fund',
      priority: 80,
      message: `Ton matelas de sécurité de ${euro(matelas)} protège ton équilibre financier.`,
    });
  }

  if (epargneMoyen !== null && epargneMoyen >= 300) {
    profileInsights.push({
      id: 'saving_habit',
      priority: 75,
      message: `Ton rythme d’épargne de ${euro(epargneMoyen)} par mois peut soutenir progressivement tes projets.`,
    });
  }

  if (fiScore !== null && fiScore >= 70) {
    profileInsights.push({
      id: 'fi_score',
      priority: 60,
      message: `Ton FI-Score de ${fiScore}/100 confirme une gestion financière déjà bien structurée.`,
    });
  }

  return {
    profile,
    numbers: {
      fiScore,
      tauxEndettement,
      epargneDispo,
      matelas,
      epargneProjet,
      epargneMoyen,
      revenuNet,
    },
    profileInsights: profileInsights.sort((a, b) => b.priority - a.priority),
  };
}

module.exports = {
  analyzeProfile,
  toNumber,
  euro,
};
