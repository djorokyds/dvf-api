const { getModuleById } = require('./modules');

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

function pct(value) {
  if (value === null || value === undefined) return '';
  return `${Math.round(value * 10) / 10} %`;
}

function ratio(amount, revenus) {
  if (amount === null || revenus === null || revenus <= 0) return null;
  return (amount / revenus) * 100;
}

function parseKeyValueList(rawValue) {
  if (!rawValue) return [];

  return String(rawValue)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex <= 0) return null;

      const label = item.slice(0, separatorIndex).trim();
      const amount = toNumber(item.slice(separatorIndex + 1).trim());

      if (!label || amount === null) return null;

      return { label, amount };
    })
    .filter(Boolean);
}

function parseCategoryTransactions(rawValue) {
  if (!rawValue) return [];

  return String(rawValue)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex <= 0) return null;

      const label = item.slice(0, separatorIndex).trim();
      const averageTransactions = toNumber(item.slice(separatorIndex + 1).trim());

      if (!label || averageTransactions === null) return null;

      return { label, averageTransactions };
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
    if (fiScore >= 70) forces.push(`ton FI-Score est solide à ${fiScore}/100`);
    else if (fiScore < 50) vigilances.push(`ton FI-Score reste à renforcer à ${fiScore}/100`);
  }

  if (tauxEndettement !== null) {
    if (tauxEndettement <= 20) {
      forces.push(`ton taux d’endettement de ${tauxEndettement} % te laisse une marge confortable`);
    } else if (tauxEndettement > 35) {
      vigilances.push(`ton taux d’endettement de ${tauxEndettement} % limite ta marge`);
    }
  }

  if (matelas !== null && matelas > 0) {
    forces.push(`ton matelas de sécurité de ${euro(matelas)} est protégé`);
  }

  if (epargneProjet !== null) {
    if (epargneProjet > 0) {
      forces.push(`${euro(epargneProjet)} sont réellement mobilisables pour tes projets`);
    } else {
      vigilances.push(`ton épargne disponible est entièrement consacrée à ta sécurité`);
    }
  }

  if (epargneMoyen !== null) {
    if (epargneMoyen >= 300) forces.push(`tu épargnes en moyenne ${euro(epargneMoyen)} par mois`);
    else if (epargneMoyen < 150) vigilances.push(`ton effort d’épargne mensuel reste à consolider`);
  }

  let profile = 'à préciser';
  if (fiScore !== null) {
    if (fiScore >= 75) profile = 'solide';
    else if (fiScore >= 55) profile = 'intermédiaire';
    else profile = 'fragile';
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

function analyzeBudgetRule(query, monthlyNumbers) {
  const revenus = monthlyNumbers.revenus;
  const epargne = monthlyNumbers.epargne;

  const totalFixes = toNumber(query.total_fixes);
  const totalAutres = toNumber(query.total_autres);
  const depassement = toNumber(query.depassement);

  const fixesRatio = ratio(totalFixes, revenus);
  const autresRatio = ratio(totalAutres, revenus);
  const epargneRatio = ratio(epargne, revenus);

  const fixesOk = fixesRatio !== null ? fixesRatio <= 50 : null;
  const autresOk = autresRatio !== null ? autresRatio <= 30 : null;
  const epargneOk = epargneRatio !== null ? epargneRatio >= 20 : null;
  const budgetRespecte = depassement !== null ? depassement <= 0 : null;

  let summary = '';

  if (budgetRespecte === true && fixesOk !== false && autresOk !== false && epargneOk !== false) {
    summary = 'Ton budget respecte globalement les repères Fi-One du mois.';
  } else if (autresOk === false) {
    summary = 'Aujourd’hui, ton budget est principalement déséquilibré par les dépenses variables.';
  } else if (fixesOk === false) {
    summary = 'Ce sont surtout tes charges fixes qui limitent ta marge de manœuvre.';
  } else if (epargneOk === false) {
    summary = 'Ton effort d’épargne est aujourd’hui inférieur au repère Fi-One.';
  } else if (budgetRespecte === false) {
    summary = `Ton budget dépasse le prévisionnel de ${euro(depassement)}.`;
  } else {
    summary = 'Ton équilibre budgétaire mérite d’être précisé avec les données du mois.';
  }

  return {
    totalFixes,
    totalAutres,
    depassement,
    fixesRatio,
    autresRatio,
    epargneRatio,
    fixesOk,
    autresOk,
    epargneOk,
    budgetRespecte,
    summary,
  };
}

function analyzeMonthlySituation(query) {
  const revenus = toNumber(query.revenus);
  const depenses = toNumber(query.depenses);
  const epargne = toNumber(query.epargne);
  const variationDepenses = toNumber(query.variation_depenses);
  const variationEpargne = toNumber(query.variation_epargne);

  const autresCharges = parseKeyValueList(query.autres_charges);
  const variationCategories = parseKeyValueList(query.variation_categories);
  const transactionsByCategory = parseCategoryTransactions(query.nb_transactions);

  const numbers = { revenus, depenses, epargne, variationDepenses, variationEpargne };
  const budgetRule = analyzeBudgetRule(query, numbers);

  const forces = [];
  const vigilances = [];
  const observations = [];

  if (epargne !== null) {
    if (epargne > 0) forces.push(`tu as dégagé ${euro(epargne)} d’épargne ce mois-ci`);
    else vigilances.push(`tu n’as pas dégagé d’épargne positive ce mois-ci`);
  }

  if (variationEpargne !== null) {
    if (variationEpargne > 0) {
      forces.push(`ton épargne progresse de ${euro(variationEpargne)} par rapport au mois dernier`);
    } else if (variationEpargne < 0) {
      vigilances.push(`ton épargne recule de ${euro(Math.abs(variationEpargne))} par rapport au mois dernier`);
    }
  }

  if (variationDepenses !== null) {
    if (variationDepenses > 0) {
      vigilances.push(`tes dépenses augmentent de ${euro(variationDepenses)} par rapport au mois dernier`);
    } else if (variationDepenses < 0) {
      forces.push(`tes dépenses diminuent de ${euro(Math.abs(variationDepenses))} par rapport au mois dernier`);
    }
  }

  if (budgetRule.budgetRespecte === true) {
    forces.push(`ton budget prévisionnel est respecté`);
  } else if (budgetRule.budgetRespecte === false) {
    vigilances.push(`ton budget prévisionnel est dépassé de ${euro(budgetRule.depassement)}`);
  }

  if (budgetRule.autresOk === false) {
    vigilances.push(`tes dépenses variables représentent ${pct(budgetRule.autresRatio)}, au-dessus du repère de 30 %`);
  }

  if (budgetRule.fixesOk === false) {
    vigilances.push(`tes charges fixes représentent ${pct(budgetRule.fixesRatio)}, au-dessus du repère de 50 %`);
  }

  if (budgetRule.epargneOk === true) {
    forces.push(`ton épargne représente ${pct(budgetRule.epargneRatio)}, conforme au repère de 20 %`);
  } else if (budgetRule.epargneOk === false) {
    vigilances.push(`ton épargne représente ${pct(budgetRule.epargneRatio)}, sous le repère de 20 %`);
  }

  const categoryIncreases = variationCategories
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const categoryDecreases = variationCategories
    .filter((category) => category.amount < 0)
    .sort((a, b) => a.amount - b.amount);

  if (categoryIncreases.length > 0) {
    const highestIncrease = categoryIncreases[0];
    vigilances.push(`la catégorie ${highestIncrease.label} enregistre la plus forte hausse avec +${euro(highestIncrease.amount)}`);
  }

  if (categoryDecreases.length > 0) {
    const highestDecrease = categoryDecreases[0];
    forces.push(`la catégorie ${highestDecrease.label} diminue de ${euro(Math.abs(highestDecrease.amount))}`);
  }

  if (revenus !== null && depenses !== null && revenus > 0) {
    const savingsRate = Math.round(((revenus - depenses) / revenus) * 1000) / 10;
    observations.push(`ton taux d’épargne réel du mois est d’environ ${savingsRate} %`);
  }

  if (budgetRule.summary) observations.push(budgetRule.summary);

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

    numbers,
    budgetRule,
    autresCharges,
    variationCategories,
    transactionsByCategory,
    forces: forces.slice(0, 4),
    vigilances: vigilances.slice(0, 3),
    observations: observations.slice(0, 3),
  };
}

function detectIntent(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`.toLowerCase();

  const hasMonthlyData =
    query.revenus ||
    query.depenses ||
    query.epargne ||
    query.variation_depenses ||
    query.variation_epargne ||
    query.autres_charges ||
    query.variation_categories ||
    query.nb_transactions ||
    query.depassement ||
    query.total_fixes ||
    query.total_autres;

  const asksMonthlyAnalysis =
    text.includes('analyse mon mois') ||
    text.includes('mois en cours') ||
    text.includes('ce mois') ||
    text.includes('bilan mensuel') ||
    text.includes('analyse mensuelle') ||
    text.includes('mois');

  if (asksMonthlyAnalysis && hasMonthlyData) return 'analyse_mensuelle';

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

function choosePriority(intent, analysis) {
  if (intent === 'analyse_mensuelle') {
    const highestIncrease = analysis.monthly.variationCategories
      .filter((category) => category.amount > 0)
      .sort((a, b) => b.amount - a.amount)[0];

    if (highestIncrease) {
      return {
        title: `Comprendre la hausse de ${highestIncrease.label}`,
        action: `Reprends les opérations de la catégorie ${highestIncrease.label} pour identifier ce qui explique les +${euro(highestIncrease.amount)} du mois.`,
        why: `Il est plus utile d’agir sur la variation la plus importante que de réduire toutes tes dépenses sans distinction.`,
      };
    }

    return {
      title: 'Comprendre l’équilibre du mois',
      action: 'Compare tes charges fixes, tes dépenses variables et ton épargne avec les repères 50/30/20.',
      why: 'Cela permet de comprendre si le déséquilibre vient des charges fixes, des dépenses variables ou d’un effort d’épargne insuffisant.',
    };
  }

  if (intent === 'simulateur_immobilier') {
    return {
      title: 'Tester ton projet immobilier',
      action: 'Lance une simulation avec ton budget cible, ton apport mobilisable et deux durées de crédit.',
      why: 'Avant de te projeter, il faut vérifier la mensualité, les frais et ton reste à vivre.',
    };
  }

  if (intent === 'capacite_emprunt') {
    return {
      title: 'Clarifier ta capacité d’emprunt',
      action: 'Simule ta capacité avec tes revenus, tes charges et ton endettement actuel.',
      why: 'Tu dois savoir jusqu’où tu peux aller sans fragiliser ton équilibre.',
    };
  }

  if (intent === 'budget') {
    return {
      title: 'Clarifier tes dépenses',
      action: 'Identifie les catégories qui pèsent le plus et celles qui progressent le plus.',
      why: 'Le montant total ne suffit pas : c’est l’évolution par catégorie qui permet d’agir utilement.',
    };
  }

  if (intent === 'epargne') {
    return {
      title: 'Structurer ton épargne',
      action: 'Distingue clairement ton matelas de sécurité de l’épargne mobilisable pour tes projets.',
      why: 'Chaque partie de ton épargne doit avoir un rôle précis.',
    };
  }

  if (intent === 'dettes') {
    return {
      title: 'Prioriser tes crédits',
      action: 'Liste tes crédits avec mensualité, taux et durée restante.',
      why: 'Cette vision permettra d’arbitrer entre remboursement anticipé et constitution d’épargne.',
    };
  }

  return {
    title: 'Renforcer tes bases',
    action: 'Revois les fondamentaux de ton budget et de ton épargne.',
    why: 'Des données claires rendent chaque décision financière plus simple.',
  };
}

function buildCoachAnalysis(query) {
  const profileAnalysis = analyzeProfile(query);
  const monthly = analyzeMonthlySituation(query);
  const intent = detectIntent(query);
  const module = getModuleById(intent);
  const mission = choosePriority(intent, {
    profile: profileAnalysis,
    monthly,
  });

  const relevantForces =
    intent === 'analyse_mensuelle' ? monthly.forces : profileAnalysis.forces;

  const relevantVigilances =
    intent === 'analyse_mensuelle' ? monthly.vigilances : profileAnalysis.vigilances;

  return {
    ...profileAnalysis,
    monthly,
    intent,
    module,
    mission,
    relevantForces,
    relevantVigilances,
  };
}

module.exports = {
  buildCoachAnalysis,
};
