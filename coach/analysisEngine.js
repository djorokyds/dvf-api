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

function ratio(amount, base) {
  if (amount === null || base === null || base <= 0) return null;
  return (amount / base) * 100;
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

function extractProjectAmount(query) {
  const text = `${query.objectif || ''} ${query.message || ''}`;
  const matches = text.match(/(\d[\d\s]{3,})\s*(€|euros)?/i);

  if (!matches) return null;
  return toNumber(matches[1]);
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
    summary = 'Ton budget reste globalement équilibré.';
  } else if (autresOk === false) {
    summary = 'Ton budget est principalement déséquilibré par les dépenses variables.';
  } else if (fixesOk === false) {
    summary = 'Tes charges fixes limitent aujourd’hui ta marge de manœuvre.';
  } else if (epargneOk === false) {
    summary = 'Ton niveau d’épargne du mois limite ta capacité à accélérer tes projets.';
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

  const numbers = {
    revenus,
    depenses,
    epargne,
    variationDepenses,
    variationEpargne,
  };

  const budgetRule = analyzeBudgetRule(query, numbers);

  const categoryIncreases = variationCategories
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const categoryDecreases = variationCategories
    .filter((category) => category.amount < 0)
    .sort((a, b) => a.amount - b.amount);

  const highestIncrease = categoryIncreases[0] || null;
  const highestDecrease = categoryDecreases[0] || null;

  const consequences = [];

  if (budgetRule.budgetRespecte === false) {
    consequences.push(`le budget prévisionnel est dépassé de ${euro(budgetRule.depassement)}`);
  }

  if (budgetRule.autresOk === false) {
    consequences.push(`les dépenses variables pèsent trop dans l’équilibre du mois`);
  }

  if (budgetRule.fixesOk === false) {
    consequences.push(`les charges fixes réduisent ta liberté d’ajustement`);
  }

  if (budgetRule.epargneOk === false) {
    consequences.push(`l’épargne du mois ne renforce pas assez tes objectifs`);
  }

  if (highestIncrease) {
    consequences.push(`la hausse la plus visible vient de ${highestIncrease.label} avec +${euro(highestIncrease.amount)}`);
  }

  if (variationEpargne !== null && variationEpargne > 0) {
    consequences.push(`ton épargne progresse malgré les mouvements du mois`);
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

    numbers,
    budgetRule,
    autresCharges,
    variationCategories,
    transactionsByCategory,
    highestIncrease,
    highestDecrease,
    consequences,
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

function buildDecisionDrivers(intent, profileAnalysis, monthly, query) {
  const reassure = [];
  const friction = [];

  const projectAmount = extractProjectAmount(query);
  const {
    epargneProjet,
    tauxEndettement,
    epargneMoyen,
  } = profileAnalysis.numbers;

  if (intent === 'simulateur_immobilier') {
    if (epargneProjet !== null && epargneProjet > 0) {
      reassure.push(`${euro(epargneProjet)} sont déjà mobilisables pour constituer ton apport`);
    }

    if (tauxEndettement !== null && tauxEndettement <= 20) {
      reassure.push(`ton endettement de ${tauxEndettement} % laisse une vraie marge pour financer un projet`);
    }

    if (projectAmount && epargneProjet !== null) {
      const apportRatio = ratio(epargneProjet, projectAmount);

      if (apportRatio !== null && apportRatio < 10) {
        friction.push(
          `pour un projet de ${euro(projectAmount)}, ton apport mobilisable reste le principal levier à renforcer`
        );
      }
    }

    if (!friction.length && epargneMoyen !== null && epargneMoyen >= 300) {
      friction.push(
        `le prochain enjeu est de transformer ta capacité d’épargne en apport plus solide`
      );
    }

    return {
      reassure: reassure.slice(0, 2),
      friction: friction[0] || '',
    };
  }

  if (intent === 'analyse_mensuelle') {
    if (monthly.budgetRule.budgetRespecte === true) {
      reassure.push('ton budget prévisionnel est respecté ce mois-ci');
    }

    if (monthly.budgetRule.epargneOk === true) {
      reassure.push(`ton épargne représente ${pct(monthly.budgetRule.epargneRatio)}, ce qui soutient tes objectifs`);
    }

    if (monthly.budgetRule.summary) {
      friction.push(monthly.budgetRule.summary);
    }

    if (monthly.highestIncrease) {
      friction.push(
        `${monthly.highestIncrease.label} explique la plus forte hausse du mois avec +${euro(monthly.highestIncrease.amount)}`
      );
    }

    return {
      reassure: reassure.slice(0, 2),
      friction: friction[0] || '',
    };
  }

  if (intent === 'epargne') {
    if (profileAnalysis.numbers.matelas !== null) {
      reassure.push(`ton matelas de sécurité de ${euro(profileAnalysis.numbers.matelas)} protège ton équilibre`);
    }

    if (epargneMoyen !== null && epargneMoyen > 0) {
      reassure.push(`ton rythme d’épargne de ${euro(epargneMoyen)} par mois peut soutenir tes projets`);
    }

    if (epargneProjet !== null && epargneProjet <= 0) {
      friction.push('ton épargne disponible est encore entièrement absorbée par ta sécurité');
    }

    return {
      reassure: reassure.slice(0, 2),
      friction: friction[0] || '',
    };
  }

  return {
    reassure: [],
    friction: '',
  };
}

function choosePriority(intent, analysis) {
  if (intent === 'analyse_mensuelle') {
    const highestIncrease = analysis.monthly.highestIncrease;

    if (highestIncrease) {
      return {
        title: `Comprendre la hausse de ${highestIncrease.label}`,
        action: `Reprends les opérations de cette catégorie pour identifier ce qui explique les +${euro(highestIncrease.amount)} du mois.`,
        why: `C’est le levier le plus concret pour comprendre le dépassement sans réduire toutes tes dépenses au hasard.`,
      };
    }

    return {
      title: 'Comprendre l’équilibre du mois',
      action: 'Compare tes charges fixes, tes dépenses variables et ton épargne avec les repères Fi-One.',
      why: 'Cela permet d’identifier ce qui influence réellement ton budget.',
    };
  }

  if (intent === 'simulateur_immobilier') {
    return {
      title: 'Tester ton projet immobilier',
      action: 'Lance une simulation avec ton budget cible, ton apport mobilisable et deux durées de crédit.',
      why: 'Le simulateur permettra de vérifier si le projet reste confortable une fois la mensualité, les frais et le reste à vivre intégrés.',
    };
  }

  if (intent === 'capacite_emprunt') {
    return {
      title: 'Clarifier ta capacité d’emprunt',
      action: 'Simule ta capacité avec tes revenus, tes charges et ton endettement actuel.',
      why: 'Tu dois connaître ta limite confortable avant de chercher un projet.',
    };
  }

  if (intent === 'budget') {
    return {
      title: 'Identifier le vrai levier budgétaire',
      action: 'Repère la catégorie qui explique le plus l’évolution de tes dépenses.',
      why: 'Un bon ajustement commence par la cause principale, pas par une réduction générale.',
    };
  }

  if (intent === 'epargne') {
    return {
      title: 'Structurer ton épargne',
      action: 'Sépare clairement ton matelas de sécurité de l’épargne mobilisable pour tes projets.',
      why: 'Chaque euro doit avoir un rôle précis : sécurité, projet ou investissement.',
    };
  }

  if (intent === 'dettes') {
    return {
      title: 'Prioriser tes crédits',
      action: 'Liste tes crédits avec mensualité, taux et durée restante.',
      why: 'Cette vision permet d’arbitrer entre remboursement anticipé et construction d’épargne.',
    };
  }

  return {
    title: 'Clarifier la prochaine décision',
    action: 'Identifie la décision financière que tu veux prendre maintenant.',
    why: 'Le coach est plus utile lorsqu’il travaille sur une décision précise.',
  };
}

function buildCoachAnalysis(query) {
  const profileAnalysis = analyzeProfile(query);
  const monthly = analyzeMonthlySituation(query);
  const intent = detectIntent(query);
  const module = getModuleById(intent);
  const mission = choosePriority(intent, { profile: profileAnalysis, monthly });
  const decisionDrivers = buildDecisionDrivers(intent, profileAnalysis, monthly, query);

  return {
    ...profileAnalysis,
    monthly,
    intent,
    module,
    mission,
    decisionDrivers,
    relevantForces: decisionDrivers.reassure,
    relevantVigilances: decisionDrivers.friction ? [decisionDrivers.friction] : [],
  };
}

module.exports = {
  buildCoachAnalysis,
};
