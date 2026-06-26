const { getModuleById } = require('./modules');

function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('€', '')
    .replace('%', '');

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function euro(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return `${Math.round(value).toLocaleString('fr-FR')} €`;
}

function parseKeyValueList(rawValue) {
  if (!rawValue) {
    return [];
  }

  return String(rawValue)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      let separatorIndex = item.indexOf(':');

      if (separatorIndex === -1) {
        separatorIndex = item.lastIndexOf('+');

        if (separatorIndex <= 0) {
          separatorIndex = item.lastIndexOf('-');
        }
      }

      if (separatorIndex <= 0) {
        return null;
      }

      const label = item.slice(0, separatorIndex).trim();
      const rawAmount = item.slice(separatorIndex).trim();
      const amount = toNumber(rawAmount);

      if (!label || amount === null) {
        return null;
      }

      return {
        label,
        amount,
      };
    })
    .filter(Boolean);
}

function parseCategoryTransactions(rawValue) {
  if (!rawValue) {
    return [];
  }

  return String(rawValue)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':');

      if (separatorIndex <= 0) {
        return null;
      }

      const label = item.slice(0, separatorIndex).trim();
      const averageTransactions = toNumber(
        item.slice(separatorIndex + 1).trim()
      );

      if (!label || averageTransactions === null) {
        return null;
      }

      return {
        label,
        averageTransactions,
      };
    })
    .filter(Boolean);
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

  const forces = [];
  const vigilances = [];

  if (fiScore !== null) {
    if (fiScore >= 70) {
      forces.push(`ton FI-Score est solide à ${fiScore}/100`);
    } else if (fiScore < 50) {
      vigilances.push(`ton FI-Score reste à renforcer à ${fiScore}/100`);
    }
  }

  if (tauxEndettement !== null) {
    if (tauxEndettement <= 20) {
      forces.push(
        `ton taux d’endettement de ${tauxEndettement} % te laisse une marge confortable`
      );
    } else if (tauxEndettement > 35) {
      vigilances.push(
        `ton taux d’endettement de ${tauxEndettement} % limite actuellement ta marge`
      );
    }
  }

  if (matelas !== null && matelas > 0) {
    forces.push(
      `ton matelas de sécurité de ${euro(matelas)} est déjà protégé`
    );
  }

  if (epargneProjet !== null) {
    if (epargneProjet > 0) {
      forces.push(
        `${euro(epargneProjet)} sont réellement mobilisables pour tes projets`
      );
    } else {
      vigilances.push(
        `ton épargne disponible est aujourd’hui entièrement consacrée à ta sécurité`
      );
    }
  }

  if (epargneMoyen !== null) {
    if (epargneMoyen >= 300) {
      forces.push(
        `tu épargnes en moyenne ${euro(epargneMoyen)} par mois`
      );
    } else if (epargneMoyen < 150) {
      vigilances.push(
        `ton effort d’épargne mensuel reste à consolider`
      );
    }
  }

  let profile = 'à préciser';

  if (fiScore !== null) {
    if (fiScore >= 75) {
      profile = 'solide';
    } else if (fiScore >= 55) {
      profile = 'intermédiaire';
    } else {
      profile = 'fragile';
    }
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
    forces: forces.slice(0, 4),
    vigilances: vigilances.slice(0, 3),
  };
}

function analyzeMonthlySituation(query) {
  const revenus = toNumber(query.revenus);
  const depenses = toNumber(query.depenses);
  const epargne = toNumber(query.epargne);
  const variationDepenses = toNumber(query.variation_depenses);
  const variationEpargne = toNumber(query.variation_epargne);

  const autresCharges = parseKeyValueList(query.autres_charges);
  const variationCategories = parseKeyValueList(
    query.variation_categories
  );
  const transactionsByCategory = parseCategoryTransactions(
    query.nb_transactions
  );

  const forces = [];
  const vigilances = [];
  const observations = [];

  if (epargne !== null) {
    if (epargne > 0) {
      forces.push(
        `tu as dégagé ${euro(epargne)} d’épargne ce mois-ci`
      );
    } else {
      vigilances.push(
        `tu n’as pas dégagé d’épargne positive ce mois-ci`
      );
    }
  }

  if (variationEpargne !== null) {
    if (variationEpargne > 0) {
      forces.push(
        `ton épargne progresse de ${euro(variationEpargne)} par rapport au mois dernier`
      );
    } else if (variationEpargne < 0) {
      vigilances.push(
        `ton épargne recule de ${euro(Math.abs(variationEpargne))} par rapport au mois dernier`
      );
    }
  }

  if (variationDepenses !== null) {
    if (variationDepenses > 0) {
      vigilances.push(
        `tes dépenses augmentent de ${euro(variationDepenses)} par rapport au mois dernier`
      );
    } else if (variationDepenses < 0) {
      forces.push(
        `tes dépenses diminuent de ${euro(Math.abs(variationDepenses))} par rapport au mois dernier`
      );
    }
  }

  const categoryIncreases = variationCategories
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const categoryDecreases = variationCategories
    .filter((category) => category.amount < 0)
    .sort((a, b) => a.amount - b.amount);

  if (categoryIncreases.length > 0) {
    const highestIncrease = categoryIncreases[0];

    vigilances.push(
      `la catégorie ${highestIncrease.label} enregistre la plus forte hausse avec +${euro(highestIncrease.amount)}`
    );
  }

  if (categoryDecreases.length > 0) {
    const highestDecrease = categoryDecreases[0];

    forces.push(
      `la catégorie ${highestDecrease.label} diminue de ${euro(Math.abs(highestDecrease.amount))}`
    );
  }

  if (
    revenus !== null &&
    depenses !== null &&
    revenus > 0
  ) {
    const savingsRate = Math.round(
      ((revenus - depenses) / revenus) * 1000
    ) / 10;

    observations.push(
      `ton taux d’épargne réel du mois est d’environ ${savingsRate} %`
    );
  }

  const biggestFixedCharges = [...autresCharges]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  if (biggestFixedCharges.length > 0) {
    observations.push(
      `tes principales charges identifiées sont ${biggestFixedCharges
        .map((charge) => `${charge.label} à ${euro(charge.amount)}`)
        .join(', ')}`
    );
  }

  return {
    hasData:
      revenus !== null ||
      depenses !== null ||
      epargne !== null ||
      variationDepenses !== null ||
      variationEpargne !== null ||
      autresCharges.length > 0 ||
      variationCategories.length > 0 ||
      transactionsByCategory.length > 0,

    numbers: {
      revenus,
      depenses,
      epargne,
      variationDepenses,
      variationEpargne,
    },

    autresCharges,
    variationCategories,
    transactionsByCategory,
    forces: forces.slice(0, 3),
    vigilances: vigilances.slice(0, 2),
    observations: observations.slice(0, 3),
  };
}

function detectIntent(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`
    .toLowerCase();

  const hasMonthlyData =
    query.revenus ||
    query.depenses ||
    query.epargne ||
    query.variation_depenses ||
    query.variation_epargne ||
    query.autres_charges ||
    query.variation_categories ||
    query.nb_transactions;
  
  const asksMonthlyAnalysis =
    text.includes('analyse mon mois') ||
    text.includes('mois en cours') ||
    text.includes('ce mois') ||
    text.includes('bilan mensuel') ||
    text.includes('analyse mensuelle') ||
    text.includes('mois');
  
  if (asksMonthlyAnalysis && hasMonthlyData) {
    return 'analyse_mensuelle';
  }

  if (
    text.includes('mensualité') ||
    text.includes('capacité') ||
    text.includes('emprunter')
  ) {
    return 'capacite_emprunt';
  }

  if (
    text.includes('achat') ||
    text.includes('immobilier') ||
    text.includes('bien') ||
    text.includes('apport')
  ) {
    return 'simulateur_immobilier';
  }

  if (
    text.includes('dette') ||
    text.includes('crédit') ||
    text.includes('auto') ||
    text.includes('conso')
  ) {
    return 'dettes';
  }

  if (
    text.includes('épargne') ||
    text.includes('epargne') ||
    text.includes('matelas')
  ) {
    return 'epargne';
  }

  if (
    text.includes('budget') ||
    text.includes('dépense') ||
    text.includes('depense')
  ) {
    return 'budget';
  }

  return 'formation_gestion';
}

function choosePriority(intent, analysis) {
  if (intent === 'analyse_mensuelle') {
    const highestIncrease =
      analysis.monthly.variationCategories
        .filter((category) => category.amount > 0)
        .sort((a, b) => b.amount - a.amount)[0];

    if (highestIncrease) {
      return {
        title: `Comprendre la hausse de ${highestIncrease.label}`,
        action:
          `Reprends les opérations de la catégorie ${highestIncrease.label} pour identifier ce qui explique les +${euro(highestIncrease.amount)} du mois.`,
        why:
          `Il est plus utile d’agir sur la variation la plus importante que de réduire toutes tes dépenses sans distinction.`,
      };
    }

    return {
      title: 'Comprendre l’évolution du mois',
      action:
        'Compare les revenus, les dépenses et l’épargne du mois avec le mois précédent.',
      why:
        'L’objectif est d’identifier ce qui a réellement amélioré ou dégradé ton équilibre.',
    };
  }

  if (intent === 'simulateur_immobilier') {
    return {
      title: 'Tester ton projet immobilier',
      action:
        'Lance une simulation avec ton budget cible, ton apport mobilisable et deux durées de crédit.',
      why:
        'Avant de te projeter, il faut vérifier la mensualité, les frais et ton reste à vivre.',
    };
  }

  if (intent === 'capacite_emprunt') {
    return {
      title: 'Clarifier ta capacité d’emprunt',
      action:
        'Simule ta capacité avec tes revenus, tes charges et ton endettement actuel.',
      why:
        'Tu dois savoir jusqu’où tu peux aller sans fragiliser ton équilibre.',
    };
  }

  if (intent === 'budget') {
    return {
      title: 'Clarifier tes dépenses',
      action:
        'Identifie les catégories qui pèsent le plus et celles qui progressent le plus.',
      why:
        'Le montant total ne suffit pas : c’est l’évolution par catégorie qui permet d’agir utilement.',
    };
  }

  if (intent === 'epargne') {
    return {
      title: 'Structurer ton épargne',
      action:
        'Distingue clairement ton matelas de sécurité de l’épargne mobilisable pour tes projets.',
      why:
        'Chaque partie de ton épargne doit avoir un rôle précis.',
    };
  }

  if (intent === 'dettes') {
    return {
      title: 'Prioriser tes crédits',
      action:
        'Liste tes crédits avec mensualité, taux et durée restante.',
      why:
        'Cette vision permettra d’arbitrer entre remboursement anticipé et constitution d’épargne.',
    };
  }

  return {
    title: 'Renforcer tes bases',
    action:
      'Revois les fondamentaux de ton budget et de ton épargne.',
    why:
      'Des données claires rendent chaque décision financière plus simple.',
  };
}

function buildCoachAnalysis(query) {
  const profileAnalysis = analyzeProfile(query);
  const monthly = analyzeMonthlySituation(query);
  const intent = detectIntent(query);
  const module = getModuleById(intent);
  const priority = choosePriority(intent, {
    profile: profileAnalysis,
    monthly,
  });

  const relevantForces =
    intent === 'analyse_mensuelle'
      ? monthly.forces
      : profileAnalysis.forces;

  const relevantVigilances =
    intent === 'analyse_mensuelle'
      ? monthly.vigilances
      : profileAnalysis.vigilances;

  return {
    ...profileAnalysis,
    monthly,
    intent,
    module,
    mission: priority,

    display: {
      showReassurance: relevantForces.length > 0,
      showFriction: relevantVigilances.length > 0,
    },

    relevantForces,
    relevantVigilances,
  };
}

module.exports = {
  buildCoachAnalysis,
};
