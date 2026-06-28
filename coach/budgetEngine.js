const { toNumber, euro } = require('./profileEngine');

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

function analyzeBudget(query) {
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

  const budgetInsights = [];

  if (budgetRule.summary) {
    budgetInsights.push({
      id: 'budget_summary',
      priority: 100,
      message: budgetRule.summary,
    });
  }

  if (budgetRule.budgetRespecte === false) {
    budgetInsights.push({
      id: 'budget_exceeded',
      priority: 95,
      message: `Le budget prévisionnel est dépassé de ${euro(budgetRule.depassement)}.`,
    });
  }

  if (budgetRule.autresOk === false) {
    budgetInsights.push({
      id: 'variable_expenses',
      priority: 90,
      message: `Les dépenses variables représentent ${pct(budgetRule.autresRatio)} des revenus et expliquent une partie du déséquilibre.`,
    });
  }

  if (budgetRule.fixesOk === false) {
    budgetInsights.push({
      id: 'fixed_expenses',
      priority: 90,
      message: `Les charges fixes représentent ${pct(budgetRule.fixesRatio)} des revenus et réduisent ta marge d’ajustement.`,
    });
  }

  if (budgetRule.epargneOk === true) {
    budgetInsights.push({
      id: 'saving_ok',
      priority: 80,
      message: `L’épargne du mois représente ${pct(budgetRule.epargneRatio)} des revenus et soutient tes objectifs.`,
    });
  }

  if (highestIncrease) {
    budgetInsights.push({
      id: 'highest_increase',
      priority: 85,
      message: `${highestIncrease.label} explique la plus forte hausse du mois avec +${euro(highestIncrease.amount)}.`,
      category: highestIncrease.label,
      amount: highestIncrease.amount,
    });
  }

  if (highestDecrease) {
    budgetInsights.push({
      id: 'highest_decrease',
      priority: 70,
      message: `${highestDecrease.label} diminue de ${euro(Math.abs(highestDecrease.amount))}.`,
      category: highestDecrease.label,
      amount: highestDecrease.amount,
    });
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
    budgetInsights: budgetInsights.sort((a, b) => b.priority - a.priority),
  };
}

module.exports = {
  analyzeBudget,
  pct,
  ratio,
  parseKeyValueList,
  parseCategoryTransactions,
};
