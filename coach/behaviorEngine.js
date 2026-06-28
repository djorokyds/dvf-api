const { euro } = require('./profileEngine');

function findTransactionInfo(categoryLabel, transactionsByCategory = []) {
  return transactionsByCategory.find(
    (item) =>
      item.label &&
      categoryLabel &&
      item.label.toLowerCase() === categoryLabel.toLowerCase()
  );
}

function detectBehaviorPattern(variationAmount, transactionCount) {
  if (variationAmount === null || variationAmount === undefined) {
    return null;
  }

  if (Math.abs(variationAmount) < 30) {
    return 'categorie_stable';
  }

  if (variationAmount < 0) {
    if (transactionCount !== null && transactionCount >= 8) {
      return 'habitude_maitrisee';
    }

    return 'depense_mieux_maitrisee';
  }

  if (transactionCount === null || transactionCount === undefined) {
    return 'hausse_a_surveilleiller';
  }

  if (transactionCount <= 2 && variationAmount >= 80) {
    return 'achat_exceptionnel';
  }

  if (transactionCount >= 9) {
    return 'habitude_en_hausse';
  }

  return 'hausse_a_surveilleiller';
}

function buildBehaviorMessage(category, pattern, variationAmount) {
  const amount = euro(Math.abs(variationAmount));

  if (pattern === 'achat_exceptionnel') {
    return `La hausse de ${category} semble liée à un achat ponctuel de ${amount}, pas forcément à une nouvelle habitude.`;
  }

  if (pattern === 'habitude_en_hausse') {
    return `La hausse de ${category} semble venir d’habitudes répétées qui prennent progressivement plus de place dans ton budget.`;
  }

  if (pattern === 'hausse_a_surveilleiller') {
    return `${category} augmente de ${amount} ce mois-ci et mérite d’être regardé avant que cela devienne une habitude.`;
  }

  if (pattern === 'habitude_maitrisee') {
    return `${category} semble mieux maîtrisé ce mois-ci, avec une baisse de ${amount} malgré des dépenses répétées.`;
  }

  if (pattern === 'depense_mieux_maitrisee') {
    return `${category} diminue de ${amount}, ce qui montre une meilleure maîtrise sur ce poste.`;
  }

  return '';
}

function getPatternPriority(pattern, variationAmount) {
  const base = Math.abs(variationAmount);

  const bonus = {
    habitude_en_hausse: 70,
    achat_exceptionnel: 30,
    hausse_a_surveilleiller: 45,
    habitude_maitrisee: 35,
    depense_mieux_maitrisee: 25,
    categorie_stable: 0,
  }[pattern] || 0;

  return base + bonus;
}

function analyzeBehavior(budgetAnalysis) {
  const insights = [];

  const variations = budgetAnalysis.variationCategories || [];
  const transactions = budgetAnalysis.transactionsByCategory || [];

  variations.forEach((category) => {
    const transactionInfo = findTransactionInfo(category.label, transactions);

    const transactionCount =
      transactionInfo?.averageTransactions !== undefined
        ? transactionInfo.averageTransactions
        : null;

    const pattern = detectBehaviorPattern(
      category.amount,
      transactionCount
    );

    if (!pattern || pattern === 'categorie_stable') {
      return;
    }

    insights.push({
      category: category.label,
      variation: category.amount,
      transactions: transactionCount,
      pattern,
      priority: getPatternPriority(pattern, category.amount),
      message: buildBehaviorMessage(
        category.label,
        pattern,
        category.amount
      ),
    });
  });

  return insights.sort((a, b) => b.priority - a.priority);
}

module.exports = {
  analyzeBehavior,
};
