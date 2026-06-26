const { getModuleById } = require('./modules');

function toNumber(value) {
  const number = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function euro(value) {
  return `${Math.round(value).toLocaleString('fr-FR')} €`;
}

function detectIntent(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`.toLowerCase();

  if (text.includes('mensualité') || text.includes('capacité') || text.includes('emprunter')) {
    return 'capacite_emprunt';
  }

  if (text.includes('achat') || text.includes('immobilier') || text.includes('bien') || text.includes('apport')) {
    return 'simulateur_immobilier';
  }

  if (text.includes('dette') || text.includes('crédit') || text.includes('auto') || text.includes('conso')) {
    return 'dettes';
  }

  if (text.includes('épargne') || text.includes('epargne') || text.includes('matelas')) {
    return 'epargne';
  }

  if (text.includes('budget') || text.includes('dépense') || text.includes('depense')) {
    return 'budget';
  }

  return 'formation_gestion';
}

function analyseFinancialProfile(query) {
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

  const forces = [];
  const vigilances = [];

  if (fiScore !== null && fiScore >= 70) {
    forces.push(`FI-Score solide à ${fiScore}/100`);
  }

  if (tauxEndettement !== null && tauxEndettement <= 20) {
    forces.push(`endettement maîtrisé à ${tauxEndettement}%`);
  } else if (tauxEndettement !== null && tauxEndettement > 35) {
    vigilances.push(`endettement élevé à ${tauxEndettement}%`);
  }

  if (epargneDispo !== null && matelas !== null) {
    forces.push(`${euro(matelas)} protégés comme matelas de sécurité`);

    if (epargneProjet > 0) {
      forces.push(`${euro(epargneProjet)} mobilisables pour tes projets`);
    } else {
      vigilances.push(`toute ton épargne disponible est absorbée par ton matelas de sécurité`);
    }
  }

  if (epargneMoyen !== null && epargneMoyen >= 300) {
    forces.push(`épargne moyenne de ${euro(epargneMoyen)} par mois`);
  }

  const profile =
    fiScore >= 75 ? 'solide' :
    fiScore >= 55 ? 'intermédiaire' :
    fiScore !== null ? 'fragile' :
    'à préciser';

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
    forces: forces.slice(0, 4),
    vigilances: vigilances.slice(0, 3),
  };
}

function chooseMission(intent) {
  const missions = {
    simulateur_immobilier: {
      title: 'Tester ton projet immobilier',
      action: 'Lance une simulation avec ton budget cible, ton apport mobilisable et deux durées de crédit.',
      why: 'Avant de te projeter, il faut vérifier la mensualité, les frais et ton reste à vivre.',
    },
    capacite_emprunt: {
      title: 'Clarifier ta capacité',
      action: 'Simule ta capacité d’emprunt avec tes revenus, tes charges et ton taux d’endettement actuel.',
      why: 'Tu dois savoir jusqu’où tu peux aller sans fragiliser ton équilibre.',
    },
    budget: {
      title: 'Reprendre le contrôle du budget',
      action: 'Identifie tes trois plus grosses dépenses variables du mois.',
      why: 'C’est souvent là que se trouve la marge la plus rapide à récupérer.',
    },
    epargne: {
      title: 'Structurer ton épargne',
      action: 'Sépare clairement ton matelas de sécurité, ton apport et ton épargne projet.',
      why: 'Une épargne utile doit avoir une mission précise.',
    },
    dettes: {
      title: 'Prioriser tes crédits',
      action: 'Liste tes crédits avec mensualité, durée restante et taux.',
      why: 'On ne peut pas arbitrer entre rembourser et épargner sans cette vision.',
    },
    formation_gestion: {
      title: 'Renforcer tes bases',
      action: 'Revois les fondamentaux de ton budget et de ton épargne cette semaine.',
      why: 'Des bases claires rendent chaque décision financière plus simple.',
    },
  };

  return missions[intent] || missions.formation_gestion;
}

function buildCoachAnalysis(query) {
  const profileAnalysis = analyseFinancialProfile(query);
  const intent = detectIntent(query);
  const module = getModuleById(intent);
  const mission = chooseMission(intent);

  return {
    ...profileAnalysis,
    intent,
    module,
    mission,
  };
}

module.exports = {
  buildCoachAnalysis,
};
